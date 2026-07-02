// Persists imported audio files to IndexedDB.
// Uses a dedicated AudioContext (not Tone.js) so import works before any audio interaction.

interface BufferEntry {
  name: string
  buffer: AudioBuffer
  duration: number
  source: 'fx' | 'import'
}

interface IDBRecord {
  id: string
  name: string
  source: 'fx' | 'import'
  arrayBuffer: ArrayBuffer
  duration: number
}

const DB_NAME = 'music-app-fx'
const STORE_NAME = 'audio-files'

// Shared decode context — lazily created, stays open
let _ctx: AudioContext | null = null
function getDecodeCtx(): AudioContext {
  if (!_ctx || _ctx.state === 'closed') _ctx = new AudioContext()
  return _ctx
}

const bufferMap = new Map<string, BufferEntry>()

async function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE_NAME, { keyPath: 'id' })
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function idbPut(record: IDBRecord): Promise<void> {
  const db = await openDB()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const req = tx.objectStore(STORE_NAME).put(record)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
    tx.oncomplete = () => db.close()
  })
}

async function idbDelete(id: string): Promise<void> {
  const db = await openDB()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const req = tx.objectStore(STORE_NAME).delete(id)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
    tx.oncomplete = () => db.close()
  })
}

async function idbUpdate(id: string, patch: Partial<IDBRecord>): Promise<void> {
  const db = await openDB()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const getReq = store.get(id)
    getReq.onsuccess = () => {
      if (!getReq.result) { resolve(); return }
      const putReq = store.put({ ...getReq.result, ...patch })
      putReq.onerror = () => reject(putReq.error)
    }
    getReq.onerror = () => reject(getReq.error)
    tx.oncomplete = () => { db.close(); resolve() }
  })
}

// Load all persisted files on startup
export async function initBuffers(): Promise<Array<{ id: string; name: string; duration: number; source: 'fx' | 'import' }>> {
  const db = await openDB()
  const records = await new Promise<IDBRecord[]>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const req = tx.objectStore(STORE_NAME).getAll()
    req.onsuccess = () => resolve(req.result as IDBRecord[])
    req.onerror = () => reject(req.error)
    tx.oncomplete = () => db.close()
  })

  const result: Array<{ id: string; name: string; duration: number; source: 'fx' | 'import' }> = []
  const ctx = getDecodeCtx()
  for (const rec of records) {
    try {
      const buffer = await ctx.decodeAudioData(rec.arrayBuffer.slice(0))
      bufferMap.set(rec.id, { name: rec.name, buffer, duration: rec.duration, source: rec.source })
      result.push({ id: rec.id, name: rec.name, duration: rec.duration, source: rec.source })
    } catch {
      // Corrupted — remove it
      await idbDelete(rec.id).catch(() => {})
    }
  }
  return result
}

export async function importFile(
  id: string,
  name: string,
  arrayBuffer: ArrayBuffer,
  source: 'fx' | 'import'
): Promise<{ duration: number }> {
  const ctx = getDecodeCtx()
  const buffer = await ctx.decodeAudioData(arrayBuffer.slice(0))
  bufferMap.set(id, { name, buffer, duration: buffer.duration, source })
  await idbPut({ id, name, source, duration: buffer.duration, arrayBuffer: arrayBuffer.slice(0) })
  return { duration: buffer.duration }
}

export async function renameFile(id: string, newName: string): Promise<void> {
  const entry = bufferMap.get(id)
  if (entry) entry.name = newName
  await idbUpdate(id, { name: newName })
}

export async function deleteFile(id: string): Promise<void> {
  bufferMap.delete(id)
  await idbDelete(id)
}

export function getBuffer(id: string): AudioBuffer | undefined {
  return bufferMap.get(id)?.buffer
}

export function getDecodeContext(): AudioContext {
  return getDecodeCtx()
}
