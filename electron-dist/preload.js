"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
electron_1.contextBridge.exposeInMainWorld('electronAPI', {
    savePattern: (json) => electron_1.ipcRenderer.invoke('save-pattern', json),
    loadPattern: () => electron_1.ipcRenderer.invoke('load-pattern'),
    exportWav: (buffer) => electron_1.ipcRenderer.invoke('export-wav', buffer),
});
