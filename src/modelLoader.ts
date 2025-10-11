import { getCachedModel, cacheModel } from './modelCache'

interface LoadProgress {
  fileName: string
  loaded: number
  total: number
}

export class ModelLoader {
  private baseURL: string
  private onProgress?: (progress: LoadProgress) => void
  private loadedFiles = new Map<string, ArrayBuffer>()

  constructor(baseURL: string, onProgress?: (progress: LoadProgress) => void) {
    this.baseURL = baseURL
    this.onProgress = onProgress
  }

  async fetchWithCache(fileName: string): Promise<ArrayBuffer> {
    // Check if already loaded in memory
    if (this.loadedFiles.has(fileName)) {
      console.log(`Model file "${fileName}" already loaded in memory`)
      return this.loadedFiles.get(fileName)!
    }

    // Check IndexedDB cache
    const cached = await getCachedModel(fileName)
    if (cached) {
      this.loadedFiles.set(fileName, cached)
      return cached
    }

    // Download from network
    console.log(`Downloading model file "${fileName}" from network...`)
    const url = this.baseURL + fileName
    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`Failed to fetch ${fileName}: ${response.statusText}`)
    }

    const contentLength = response.headers.get('content-length')
    const total = contentLength ? parseInt(contentLength, 10) : 0

    if (!response.body) {
      throw new Error(`No response body for ${fileName}`)
    }

    const reader = response.body.getReader()
    const chunks: Uint8Array[] = []
    let loaded = 0

    while (true) {
      const { done, value } = await reader.read()

      if (done) break

      chunks.push(value)
      loaded += value.length

      if (this.onProgress && total > 0) {
        this.onProgress({ fileName, loaded, total })
      }
    }

    // Combine chunks into single ArrayBuffer
    const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0)
    const result = new Uint8Array(totalLength)
    let offset = 0
    for (const chunk of chunks) {
      result.set(chunk, offset)
      offset += chunk.length
    }

    const arrayBuffer = result.buffer

    // Cache the downloaded file
    await cacheModel(fileName, arrayBuffer)

    // Store in memory
    this.loadedFiles.set(fileName, arrayBuffer)

    return arrayBuffer
  }

  createBlobURL(fileName: string, arrayBuffer: ArrayBuffer, mimeType: string): string {
    const blob = new Blob([arrayBuffer], { type: mimeType })
    return URL.createObjectURL(blob)
  }

  async preloadFiles(fileNames: string[]): Promise<void> {
    console.log(`Preloading ${fileNames.length} model files...`)
    await Promise.all(fileNames.map(fileName => this.fetchWithCache(fileName)))
    console.log('All model files preloaded')
  }

  getLoadedFile(fileName: string): ArrayBuffer | undefined {
    return this.loadedFiles.get(fileName)
  }

  clear(): void {
    this.loadedFiles.clear()
  }
}
