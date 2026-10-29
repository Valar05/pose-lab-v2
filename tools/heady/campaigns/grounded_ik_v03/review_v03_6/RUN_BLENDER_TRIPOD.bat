@echo off
REM Original v03.6.0 invocation: RUN_BLENDER_TRIPOD.bat
setlocal
set "HERE=%~dp0"
where blender >nul 2>nul
if errorlevel 1 (
  echo CAMPAIGN_STATUS=BLOCKED
  echo REASON=BLENDER_EXE_NOT_ON_PATH
  exit /b 2
)
blender --background --python "%HERE%blender_bake_six_leg_tripod.py" -- --source "%HERE%Meshy_AI_Character_output (1).glb" --tracks "%HERE%tripod_bone_tracks.json" --out "%HERE%Blender_Exports" %*
if errorlevel 1 (echo CAMPAIGN_STATUS=BLOCKED_BLABER_EXECUTION & exit /b 1)
