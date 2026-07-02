interface ElectronAPI {
  savePattern: (json: string) => Promise<{ success: boolean }>
  loadPattern: () => Promise<{ success: boolean; json?: string }>
  exportWav: (buffer: ArrayBuffer) => Promise<{ success: boolean }>
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI
  }
}

export {}
