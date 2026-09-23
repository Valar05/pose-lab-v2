# Motion Profile Lab Operator Campaign

Stable entrypoint:

```sh
bash campaigns/motion_profile_lab/campaign.sh run
```

Controls:

```sh
bash campaigns/motion_profile_lab/campaign.sh status
bash campaigns/motion_profile_lab/campaign.sh follow
bash campaigns/motion_profile_lab/campaign.sh stop
bash campaigns/motion_profile_lab/campaign.sh resume
bash campaigns/motion_profile_lab/campaign.sh receipts
bash campaigns/motion_profile_lab/campaign.sh canary
```

The launcher returns the shell immediately. Work runs in the dedicated tmux session
`plv2-motion-profile`. State and receipts live under
`$HOME/.local/state/pose-lab-v2-motion-profile-lab`.

Success and failure receipts are copied to the Android clipboard when
`termux-clipboard-set` is available.

The campaign preserves dirty worktrees by refusing to update them, fast-forwards
only from `origin/main`, builds Pose Lab V2, verifies the Motion Profile Lab
route/module, opens the phone review URL, exposes heartbeat/liveness through
`status`, and provides an out-of-band `stop` path.
