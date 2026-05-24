const { contextBridge, ipcRenderer } = require('electron');

const isPackaged = process.argv.includes('--is-packaged');

contextBridge.exposeInMainWorld('electronAPI', {
    showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),
    isPackaged: isPackaged
});
