# Command Center Dispatch Prompt

Use this prompt packet when dispatching `pose-lab-v2` animation learning work
through Home Center Command Center MCP.

## Worker Prompt

You are a one-shot Codex worker running under Home Center Command Center MCP.

Read, in order:

1. `CODEX_STARTS_HERE.md`
2. `PROJECT_ORIENTATION.md`
3. `docs/CLOUD_WORKER_ANIMATION_SURFACE.md`
4. `docs/CLOUD_WORKER_OUTPUT_CONTRACT.md`
5. the packaged cloud job `job.json`

Your task is diagnostic only. Consume the packaged job inputs, analyze the
learning surface, and write worker outputs under:

```text
generated/cloud-worker-jobs/<job-id>/outputs/
```

Do not mutate runtime files, accepted pose modules, public assets, docs, or
package metadata. Do not promote animation. Do not claim visual acceptance.

If the job status is `NO_TRIPOD_VIDEO`, treat that as incomplete input rather
than failure. Produce useful legacy choreography observations and clearly report
that tripod comparison is pending.

Required outputs:

```text
outputs/worker_report.md
outputs/observations.json
outputs/artifact_manifest.json
```

If blocked, also write:

```text
outputs/blocked_reason.txt
```

Run the repo preflight before and after your diagnostic work:

```sh
npm run cloud:agent-preflight
```

Return a final report listing files written, commands run, status, and residual
risks. Command Center terminal state and artifact records are the durable job
result.
