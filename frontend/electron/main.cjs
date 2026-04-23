/* eslint-disable @typescript-eslint/no-require-imports */
const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let backendProcess;

const isDev = process.env.NODE_ENV === 'development';

function startBackend() {
    const backendDir = isDev
        ? path.join(__dirname, '..', '..', 'backend')
        : path.join(process.resourcesPath, 'backend');

    const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';

    backendProcess = spawn(pythonCmd, ['api_server.py'], {
        cwd: backendDir,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1' },
    });

    backendProcess.stdout.on('data', (data) => {
        console.log(`[Backend] ${data.toString().trim()}`);
    });

    backendProcess.stderr.on('data', (data) => {
        console.error(`[Backend ERR] ${data.toString().trim()}`);
    });

    backendProcess.on('error', (err) => {
        console.error('Failed to start backend:', err.message);
    });

    backendProcess.on('exit', (code) => {
        console.log(`Backend exited with code ${code}`);
    });
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1024,
        minHeight: 700,
        title: 'CancerScan – AI Powered Lung Cancer Detection',
        backgroundColor: '#070B1A',
        webPreferences: {
            preload: path.join(__dirname, 'preload.cjs'),
            nodeIntegration: false,
            contextIsolation: true,
        },
        autoHideMenuBar: true,
    });

    if (isDev) {
        mainWindow.loadURL('http://localhost:5173');
    } else {
        mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
    }

    // Auto-open Chrome DevTools so user can inspect console errors
    mainWindow.webContents.openDevTools();

    mainWindow.webContents.on('before-input-event', async (event, input) => {
        if (input.key === 'F11' && input.type === 'keyDown') {
            const fs = require('fs');
            
            const wasDevOpened = mainWindow.webContents.isDevToolsOpened();
            if (wasDevOpened) mainWindow.webContents.closeDevTools();

            try {
                mainWindow.webContents.debugger.attach('1.3');

                const params = await mainWindow.webContents.executeJavaScript(`
                    ({
                        width: window.innerWidth,
                        maxScrollHeight: Math.max(...Array.from(document.querySelectorAll('*')).map(el => el.scrollHeight))
                    })
                `);

                const targetHeight = Math.min(params.maxScrollHeight + 50, 4000); // Cap at 4k to prevent crashes

                await mainWindow.webContents.debugger.sendCommand('Emulation.setDeviceMetricsOverride', {
                    width: params.width,
                    height: targetHeight,
                    deviceScaleFactor: 0,
                    mobile: false
                });

                await new Promise(r => setTimeout(r, 800)); // Give enough time for DOM redraw

                const { data } = await mainWindow.webContents.debugger.sendCommand('Page.captureScreenshot', {
                    format: 'png',
                    fromSurface: true
                });

                // Instantly clear emulation
                await mainWindow.webContents.debugger.sendCommand('Emulation.clearDeviceMetricsOverride');
                
                // CRITICAL FIX: Force the browser to trigger a resize event to restore the scrollbars
                await mainWindow.webContents.executeJavaScript(`
                    window.dispatchEvent(new Event('resize'));
                    document.body.style.display = 'none';
                    document.body.offsetHeight; // force reflow
                    document.body.style.display = '';
                `);
                
                mainWindow.webContents.debugger.detach();

                const screenshotPath = path.join(
                    app.getPath('desktop'),
                    `CancerScan_FullPage_${Date.now()}.png`
                );
                fs.writeFileSync(screenshotPath, Buffer.from(data, 'base64'));
                console.log('[SCREENSHOT] Full scrolling page safely saved to:', screenshotPath);

            } catch (err) {
                console.error('[SCREENSHOT] Critical Error taking full page screenshot:', err);
            } finally {
                if (wasDevOpened) mainWindow.webContents.openDevTools();
            }
        }
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

// IPC for save dialog
ipcMain.handle('show-save-dialog', async (event, options) => {
    return await dialog.showSaveDialog(mainWindow, options);
});

app.whenReady().then(() => {
    // Backend is managed externally by start_all.bat
    setTimeout(createWindow, 1000);

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
