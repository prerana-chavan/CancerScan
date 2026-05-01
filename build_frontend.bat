@echo off
title Build Standalone Frontend
echo =======================================================
echo Checking Node Modules...

cd frontend
call npm install
call npm install --save-dev electron-builder

echo.
echo =======================================================
echo Building Final Executable...
call npm run package

echo.
echo =======================================================
echo Build complete! Check frontend\dist-electron folder.
pause
