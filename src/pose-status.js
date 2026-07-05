export const POSE_STATUS = {
  "ready": {
    "status": "accepted",
    "module": "./ready-pose.js",
    "exportName": "READY_POSE_PRESET",
    "sha256": "8d8e070f0fe88001917c88d885052085286e85d56aa0081c13b4fce35dfc011d",
    "evidenceUrl": "https://valar05.github.io/pose-lab-v2/?pose=ready",
    "notes": "Accepted Ready baseline. Guardrails only; hosted visual review remains acceptance truth."
  },
  "attack1": {
    "status": "quarantined",
    "sourceClip": "OneHandAttack1",
    "fallback": "ready",
    "reason": "Previous generated Attack1 bake was human-red: invalid arm chain and blade axis. Do not iterate on the deleted copy."
  }
};
