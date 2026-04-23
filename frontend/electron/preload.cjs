const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),
});
