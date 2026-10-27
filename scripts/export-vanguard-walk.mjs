#!/usr/bin/env node
import {spawnSync} from 'node:child_process';
function run(c,a){const r=spawnSync(c,a,{stdio:'inherit'});if(r.status!==0)process.exit(r.status??1)}
run('node',['scripts/run-blender-tool.mjs','tools/author_vanguard_walk_blender.py','--','--asset','public/assets/vanguard/vanguard_rigged_animations.glb','--out-dir','generated/vanguard/walk']);
run('python3',['tools/finalize_vanguard_walk.py','--root','generated/vanguard/walk','--publish','public/assets/vanguard/fleshpunk/walk']);
