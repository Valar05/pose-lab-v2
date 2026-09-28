/**
 * Bounded adapter for Gravity Fist's buffered standard-chain cutover rule.
 * Combat timing is authoritative; presentation duration is observational only.
 */
export class GravityBufferedChainAdapter {
  constructor({ moves }) {
    if (!Array.isArray(moves) || moves.length < 2) {
      throw new Error('At least two ordered moves are required');
    }
    this.moves = moves.map((move) => {
      const normalized = {
        id: String(move.id || ''),
        semanticEndMs: Number(move.semanticEndMs),
        presentationDurationMs: Number(move.presentationDurationMs),
      };
      if (!normalized.id || !Number.isFinite(normalized.semanticEndMs) || normalized.semanticEndMs <= 0) {
        throw new Error('Each move needs an id and positive semanticEndMs');
      }
      if (!Number.isFinite(normalized.presentationDurationMs) || normalized.presentationDurationMs < normalized.semanticEndMs) {
        throw new Error('presentationDurationMs must be at least semanticEndMs');
      }
      return Object.freeze(normalized);
    });
    this.nowMs = 0;
    this.chainIndex = 0;
    this.bufferedAttack = false;
    this.activeAttack = null;
    this.presentation = null;
    this.events = [];
  }

  requestStandardAttack() {
    if (this.activeAttack) {
      const alreadyBuffered = this.bufferedAttack;
      this.bufferedAttack = true;
      if (!alreadyBuffered) this.#emit('attack-buffered', { moveId: this.activeAttack.move.id });
      return alreadyBuffered ? 'already-buffered' : 'buffered';
    }
    this.#startNextAttack(this.nowMs);
    return 'started';
  }

  advance(deltaMs) {
    const delta = Number(deltaMs);
    if (!Number.isFinite(delta) || delta < 0) throw new Error('deltaMs must be a non-negative number');
    const targetMs = this.nowMs + delta;

    while (this.activeAttack) {
      const boundaryMs = this.activeAttack.startedAtMs + this.activeAttack.move.semanticEndMs;
      if (boundaryMs > targetMs) break;
      const ended = this.activeAttack;
      this.nowMs = boundaryMs;
      this.activeAttack = null;
      this.#emit('semantic-attack-end', { moveId: ended.move.id });
      if (!this.bufferedAttack) break;
      this.bufferedAttack = false;
      this.#emit('buffer-consumed', { afterMoveId: ended.move.id });
      this.#startNextAttack(boundaryMs);
    }

    this.nowMs = targetMs;
    if (this.presentation) {
      const presentationEndMs = this.presentation.startedAtMs + this.presentation.move.presentationDurationMs;
      if (presentationEndMs <= this.nowMs) {
        const ended = this.presentation;
        this.presentation = null;
        this.events.push({ type: 'presentation-end', atMs: presentationEndMs, moveId: ended.move.id });
      }
    }
    return this.snapshot();
  }

  snapshot() {
    return {
      nowMs: this.nowMs,
      chainIndex: this.chainIndex,
      bufferedAttack: this.bufferedAttack,
      combatState: this.activeAttack ? 'attacking' : 'idle',
      activeMoveId: this.activeAttack?.move.id ?? null,
      representation: this.presentation ? {
        moveId: this.presentation.move.id,
        elapsedMs: Math.max(0, this.nowMs - this.presentation.startedAtMs),
        durationMs: this.presentation.move.presentationDurationMs,
      } : null,
      events: this.events.map((event) => ({ ...event })),
    };
  }

  #startNextAttack(atMs) {
    if (this.presentation) {
      const elapsedMs = atMs - this.presentation.startedAtMs;
      if (elapsedMs < this.presentation.move.presentationDurationMs) {
        this.events.push({
          type: 'presentation-preempted',
          atMs,
          moveId: this.presentation.move.id,
          remainingMs: this.presentation.move.presentationDurationMs - elapsedMs,
        });
      }
    }
    const move = this.moves[this.chainIndex % this.moves.length];
    this.chainIndex += 1;
    this.activeAttack = { move, startedAtMs: atMs };
    this.presentation = { move, startedAtMs: atMs };
    this.events.push({ type: 'attack-start', atMs, moveId: move.id, chainIndex: this.chainIndex });
  }

  #emit(type, detail) {
    this.events.push({ type, atMs: this.nowMs, ...detail });
  }
}
