import { openDB, DBSchema, IDBPDatabase } from 'idb'

interface ModelCacheDB extends DBSchema {
  'model-files': {
    key: string
    value: {
      name: string
      data: ArrayBuffer
      timestamp: number
      size: number
    }
  }
}

const DB_NAME = 'sherpa-onnx-models'
const DB_VERSION = 1
const STORE_NAME = 'model-files'

let dbInstance: IDBPDatabase<ModelCacheDB> | null = null

async function getDB(): Promise<IDBPDatabase<ModelCacheDB>> {
  if (dbInstance) {
    return dbInstance
  }

  dbInstance = await openDB<ModelCacheDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    }
  })

  return dbInstance
}

export async function getCachedModel(fileName: string): Promise<ArrayBuffer | null> {
  try {
    const db = await getDB()
    const cached = await db.get(STORE_NAME, fileName)

    if (cached) {
      console.log(`Model file "${fileName}" loaded from cache (${(cached.size / 1024 / 1024).toFixed(2)} MB)`)
      return cached.data
    }

    return null
  } catch (error) {
    console.error('Error retrieving cached model:', error)
    return null
  }
}

export async function cacheModel(fileName: string, data: ArrayBuffer): Promise<void> {
  try {
    const db = await getDB()
    await db.put(STORE_NAME, {
      name: fileName,
      data,
      timestamp: Date.now(),
      size: data.byteLength
    }, fileName)

    console.log(`Model file "${fileName}" cached (${(data.byteLength / 1024 / 1024).toFixed(2)} MB)`)
  } catch (error) {
    console.error('Error caching model:', error)
  }
}

export async function clearModelCache(): Promise<void> {
  try {
    const db = await getDB()
    await db.clear(STORE_NAME)
    console.log('Model cache cleared')
  } catch (error) {
    console.error('Error clearing cache:', error)
  }
}

export async function getCacheSize(): Promise<number> {
  try {
    const db = await getDB()
    const allKeys = await db.getAllKeys(STORE_NAME)
    let totalSize = 0

    for (const key of allKeys) {
      const item = await db.get(STORE_NAME, key)
      if (item) {
        totalSize += item.size
      }
    }

    return totalSize
  } catch (error) {
    console.error('Error calculating cache size:', error)
    return 0
  }
}

export async function getAllCachedModels(): Promise<string[]> {
  try {
    const db = await getDB()
    const allKeys = await db.getAllKeys(STORE_NAME)
    return allKeys as string[]
  } catch (error) {
    console.error('Error getting cached models:', error)
    return []
  }
}
