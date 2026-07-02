import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import path from 'path'
import fs from 'fs'

const isDev = process.env.NODE_ENV === 'development'

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    backgroundColor: '#0f0f13',
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (isDev) {
    win.loadURL('http://localhost:5173')
    win.webContents.openDevTools()
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

app.whenReady().then(() => {
  createWindow()
  registerIpcHandlers()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

function registerIpcHandlers() {
  ipcMain.handle('save-pattern', async (_e, json: string) => {
    const { filePath } = await dialog.showSaveDialog({
      title: 'Save Pattern',
      defaultPath: 'my-pattern.json',
      filters: [{ name: 'Pattern', extensions: ['json'] }],
    })
    if (!filePath) return { success: false }
    fs.writeFileSync(filePath, json, 'utf-8')
    return { success: true }
  })

  ipcMain.handle('load-pattern', async () => {
    const { filePaths } = await dialog.showOpenDialog({
      title: 'Load Pattern',
      filters: [{ name: 'Pattern', extensions: ['json'] }],
      properties: ['openFile'],
    })
    if (!filePaths.length) return { success: false }
    const json = fs.readFileSync(filePaths[0], 'utf-8')
    return { success: true, json }
  })

  ipcMain.handle('export-wav', async (_e, buffer: ArrayBuffer) => {
    const { filePath } = await dialog.showSaveDialog({
      title: 'Export WAV',
      defaultPath: 'recording.wav',
      filters: [{ name: 'Audio', extensions: ['wav'] }],
    })
    if (!filePath) return { success: false }
    fs.writeFileSync(filePath, Buffer.from(buffer))
    return { success: true }
  })
}
