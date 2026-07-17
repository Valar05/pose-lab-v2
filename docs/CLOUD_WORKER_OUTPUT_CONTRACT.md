# Cloud Worker Output Contract

Cloud worker outputs are diagnostic artifacts. They do not promote animation,
change runtime code, or replace hosted visual review.

## Required Outputs

Each Command Center worker job should write these files under the packaged job's
`outputs/` directory:

```text
outputs/worker_report.md
outputs/observations.json
outputs/artifact_manifest.json
```

If the worker is blocked, it should also write:

```text
outputs/blocked_reason.txt
```

## Output Meaning

- `worker_report.md`: human-readable summary of what the worker inspected,
  what it found, and what remains unknown.
- `observations.json`: structured observations about phases, timing, body
  mechanics, missing inputs, and confidence.
- `artifact_manifest.json`: list of generated files, source hashes, commands,
  and status.
- `blocked_reason.txt`: concise blocker when the worker cannot complete the
  diagnostic job.

## Mutation Boundary

For diagnostic learning jobs, workers may write only under:

```text
generated/cloud-worker-jobs/<job-id>/outputs/
```

They must not write:

```text
src/
public/
dist/
docs/
package.json
```

Promotion to accepted animation truth must use the explicit repo promotion flow
after human-visible review. Metrics, generated observations, or cloud worker
reports are not acceptance on their own.

## Low Back Kick Rule

`NO_TRIPOD_VIDEO` is incomplete, not a worker failure. A worker may still analyze
the legacy Gravity Fist `LowBackKick` choreography and report useful learning,
but it must state that tripod comparison has not happened.
