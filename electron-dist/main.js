"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const isDev = process.env.NODE_ENV === 'development';
function createWindow() {
    const win = new electron_1.BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1100,
        minHeight: 700,
        backgroundColor: '#0f0f13',
        titleBarStyle: 'hiddenInset',
        webPreferences: {
            preload: path_1.default.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
        },
    });
    if (isDev) {
        win.loadURL('http://localhost:5173');
        win.webContents.openDevTools();
    }
    else {
        win.loadFile(path_1.default.join(__dirname, '../dist/index.html'));
    }
}
electron_1.app.whenReady().then(() => {
    createWindow();
    registerIpcHandlers();
});
electron_1.app.on('window-all-closed', () => {
    if (process.platform !== 'darwin')
        electron_1.app.quit();
});
electron_1.app.on('activate', () => {
    if (electron_1.BrowserWindow.getAllWindows().length === 0)
        createWindow();
});
function registerIpcHandlers() {
    electron_1.ipcMain.handle('save-pattern', async (_e, json) => {
        const { filePath } = await electron_1.dialog.showSaveDialog({
            title: 'Save Pattern',
            defaultPath: 'my-pattern.json',
            filters: [{ name: 'Pattern', extensions: ['json'] }],
        });
        if (!filePath)
            return { success: false };
        fs_1.default.writeFileSync(filePath, json, 'utf-8');
        return { success: true };
    });
    electron_1.ipcMain.handle('load-pattern', async () => {
        const { filePaths } = await electron_1.dialog.showOpenDialog({
            title: 'Load Pattern',
            filters: [{ name: 'Pattern', extensions: ['json'] }],
            properties: ['openFile'],
        });
        if (!filePaths.length)
            return { success: false };
        const json = fs_1.default.readFileSync(filePaths[0], 'utf-8');
        return { success: true, json };
    });
    electron_1.ipcMain.handle('export-wav', async (_e, buffer) => {
        const { filePath } = await electron_1.dialog.showSaveDialog({
            title: 'Export WAV',
            defaultPath: 'recording.wav',
            filters: [{ name: 'Audio', extensions: ['wav'] }],
        });
        if (!filePath)
            return { success: false };
        fs_1.default.writeFileSync(filePath, Buffer.from(buffer));
        return { success: true };
    });
}
