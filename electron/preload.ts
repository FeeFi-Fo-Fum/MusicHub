import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  savePattern: (json: string) => ipcRenderer.invoke('save-pattern', json),
  loadPattern: () => ipcRenderer.invoke('load-pattern'),
  exportWav: (buffer: ArrayBuffer) => ipcRenderer.invoke('export-wav', buffer),
})
