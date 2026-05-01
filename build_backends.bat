@echo off
title Build Standalone Backends
echo =======================================================
echo Installing PyInstaller...
python -m pip install pyinstaller

cd backend

echo.
echo =======================================================
echo Building Main Backend (app.py)
echo This may take a few minutes...
python -m PyInstaller --noconfirm --onedir --console --add-data "uploads;uploads" --add-data "database;database" --add-data "routes;routes" app.py

echo.
echo =======================================================
echo Building ML Engine Server (api_server.py)
echo WARNING: This will take a LONG TIME because of TensorFlow!
echo Please be patient...
python -m PyInstaller --noconfirm --onedir --console --add-data "models_lcscnet_full;models_lcscnet_full" --hidden-import "tensorflow" --hidden-import "PIL" --hidden-import "numpy" --hidden-import "flask" api_server.py

echo.
echo =======================================================
echo Build complete! Check backend\dist folder.
pause
