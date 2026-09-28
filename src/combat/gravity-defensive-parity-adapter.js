/**
 * Bounded adapter for Gravity Fist's directional block -> early counter rule.
 * Combat state owns hit resolution. Presentation duration is observational only.
 */
export class GravityDefensiveParityAdapter {
  constructor({
    blockDurationMs,
    counterWindowMs,
    counterMoveId,
    counterSemanticEndMs,
    counterPresentationId,
    counterPresentationDurationMs,
    parryOffenseLockoutMs,
    blockedEnemyStunMs,
    blockedEnemyAttackLockoutMs,
    blockPresentationDurationMs = blockDurationMs,
  }) {
    const positive = {
      blockDurationMs,
      counterWindowMs,
      counterSemanticEndMs,
      counterPresentationDurationMs,
      parryOffenseLockoutMs,
      blockedEnemyStunMs,
      blockedEnemyAttackLockoutMs,
      blockPresentationDurationMs,
    };
    for (const [name, value] of Object.entries(positive)) {
      if (!Number.isFinite(Number(value)) || Number(value) <= 0) {
        throw new Error(`${name} must be a positive number`);
      }
    }
    if (Number(counterWindowMs) > Number(blockDurationMs)) {
      throw new Error('counterWindowMs cannot exceed blockDurationMs');
    }
    if (!counterMoveId || !counterPresentationId) {
      throw new Error('counter move and presentation ids are required');
    }

    this.config = Object.freeze(Object.fromEntries(
      Object.entries({ ...positive, counterMoveId: String(counterMoveId), counterPresentationId: String(counterPresentationId) })
        .map(([key, value]) => [key, typeof value === 'number' ? Number(value) : value]),
    ));
    this.nowMs = 0;
    this.combatState = 'idle';
    this.facingSign = 0;
    this.blockStartedAtMs = null;
    this.counterStartedAtMs = null;
    this.preservedChainIndex = null;
    this.standardChainIndex = 0;
    this.enemyOffenseLockedUntilMs = 0;
    this.presentation = null;
    this.events = [];
  }

  requestBlock({ directionSign, standardChainIndex = this.standardChainIndex } = {}) {
    const facingSign = Math.sign(Number(directionSign));
    if (!facingSign) throw new Error('directionSign must be non-zero');
    if (this.combatState === 'countering') {
      this.#emit('block-input-rejected', { reason: 'counter-active', buffered: false });
      return 'rejected-counter-active';
    }

    this.facingSign = facingSign;
    this.preservedChainIndex = Math.max(0, Math.trunc(Number(standardChainIndex)) || 0);
    this.standardChainIndex = 0;
    this.combatState = 'blocking';
    this.blockStartedAtMs = this.nowMs;
    this.counterStartedAtMs = null;
    this.#startPresentation('gravity-block', this.config.blockPresentationDurationMs);
    this.#emit('block-start', {
      facingSign,
      preservedChainIndex: this.preservedChainIndex,
      inputMode: 'live-only',
    });
    return 'started';
  }

  resolveIncomingHit({ attackerDirectionSign } = {}) {
    const attackerSign = Math.sign(Number(attackerDirectionSign));
    if (!attackerSign) throw new Error('attackerDirectionSign must be non-zero');
    if (this.combatState !== 'blocking') {
      this.#emit('hit-unblocked', { reason: 'not-blocking', attackerSign });
      return { blocked: false, countered: false, damageAuthorized: true };
    }
    if (attackerSign !== this.facingSign) {
      this.#emit('hit-unblocked', { reason: 'rear-hit', attackerSign });
      return { blocked: false, countered: false, damageAuthorized: true };
    }

    const blockElapsedMs = this.nowMs - this.blockStartedAtMs;
    this.#emit('enemy-attack-blocked', {
      attackerSign,
      enemyStunMs: this.config.blockedEnemyStunMs,
      enemyAttackLockoutMs: this.config.blockedEnemyAttackLockoutMs,
    });

    if (blockElapsedMs <= this.config.counterWindowMs) {
      this.#endBlock('early-counter');
      this.standardChainIndex = this.preservedChainIndex;
      this.combatState = 'countering';
      this.counterStartedAtMs = this.nowMs;
      this.enemyOffenseLockedUntilMs = Math.max(
        this.enemyOffenseLockedUntilMs,
        this.nowMs + this.config.parryOffenseLockoutMs,
      );
      this.#startPresentation(
        this.config.counterPresentationId,
        this.config.counterPresentationDurationMs,
      );
      this.#emit('counter-start', {
        moveId: this.config.counterMoveId,
        restoredChainIndex: this.standardChainIndex,
        enemyOffenseLockedUntilMs: this.enemyOffenseLockedUntilMs,
      });
      return { blocked: true, countered: true, damageAuthorized: false };
    }

    this.#emit('ordinary-block', { blockElapsedMs });
    return { blocked: true, countered: false, damageAuthorized: false };
  }

  advance(deltaMs) {
    const delta = Number(deltaMs);
    if (!Number.isFinite(delta) || delta < 0) throw new Error('deltaMs must be a non-negative number');
    const targetMs = this.nowMs + delta;

    while (true) {
      const boundaries = [];
      if (this.combatState === 'blocking') {
        boundaries.push({ type: 'block-expire', atMs: this.blockStartedAtMs + this.config.blockDurationMs });
      }
      if (this.combatState === 'countering') {
        boundaries.push({ type: 'counter-end', atMs: this.counterStartedAtMs + this.config.counterSemanticEndMs });
      }
      if (this.presentation) {
        boundaries.push({ type: 'presentation-end', atMs: this.presentation.startedAtMs + this.presentation.durationMs });
      }
      const next = boundaries
        .filter(({ atMs }) => atMs <= targetMs)
        .sort((a, b) => a.atMs - b.atMs || a.type.localeCompare(b.type))[0];
      if (!next) break;
      this.nowMs = next.atMs;
      if (next.type === 'block-expire' && this.combatState === 'blocking') {
        this.#endBlock('duration-expired');
        this.combatState = 'idle';
      } else if (next.type === 'counter-end' && this.combatState === 'countering') {
        this.combatState = 'idle';
        this.counterStartedAtMs = null;
        this.#emit('counter-semantic-end', { moveId: this.config.counterMoveId });
      } else if (next.type === 'presentation-end' && this.presentation) {
        const ended = this.presentation;
        this.presentation = null;
        this.#emit('presentation-end', { presentationId: ended.id });
      }
    }

    this.nowMs = targetMs;
    return this.snapshot();
  }

  snapshot() {
    return {
      nowMs: this.nowMs,
      combatState: this.combatState,
      facingSign: this.facingSign,
      standardChainIndex: this.standardChainIndex,
      blockElapsedMs: this.combatState === 'blocking' ? this.nowMs - this.blockStartedAtMs : null,
      enemyOffenseLockedUntilMs: this.enemyOffenseLockedUntilMs,
      enemyOffenseLocked: this.nowMs < this.enemyOffenseLockedUntilMs,
      pendingBlock: false,
      representation: this.presentation ? {
        id: this.presentation.id,
        elapsedMs: this.nowMs - this.presentation.startedAtMs,
        durationMs: this.presentation.durationMs,
      } : null,
      events: this.events.map((event) => ({ ...event })),
    };
  }

  #endBlock(reason) {
    this.#emit('block-end', { reason });
    this.blockStartedAtMs = null;
  }

  #startPresentation(id, durationMs) {
    if (this.presentation) {
      const elapsedMs = this.nowMs - this.presentation.startedAtMs;
      const remainingMs = Math.max(0, this.presentation.durationMs - elapsedMs);
      if (remainingMs > 0) {
        this.#emit('presentation-preempted', {
          presentationId: this.presentation.id,
          remainingMs,
        });
      }
    }
    this.presentation = { id, durationMs, startedAtMs: this.nowMs };
    this.#emit('presentation-start', { presentationId: id, durationMs });
  }

  #emit(type, detail = {}) {
    this.events.push({ type, atMs: this.nowMs, ...detail });
  }
}
