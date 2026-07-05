# Pose Lab V2

Clean saber placement surface.

This repo contains only:

- the Meshy A-pose/standing source GLB used as the visible character;
- the real Meshy sabre GLB;
- TFTM-style direct placement controls for the visible sabre.

It is not a Pose Lab fork. It does not include retargeting, FK/IK solvers, debug bridges, visual metric gates, case systems, or numeric authoring panels.

## Use

```sh
npm run build
```

Tap the real sabre, then use:

- `Move` to drag it in the camera plane;
- `Rotate` to orient it by drag;
- `Scale` to resize it by drag;
- `Copy Export` to copy the current transform JSON.

Numbers are readout/export only. Authoring is direct visual manipulation.

## Checks

```sh
npm run build
npm run smoke
git diff --check
```
