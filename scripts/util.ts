import { cwd, chdir } from 'process'
import { spawnSync, SpawnSyncOptionsWithStringEncoding } from 'child_process'
import { readFileSync } from 'fs'
import { createHash } from 'crypto'
import { FileLoader } from '@libreservice/micro-plum'
import { resolve, join } from 'path'

const utf8: SpawnSyncOptionsWithStringEncoding = { encoding: 'utf-8' }
const rf = { recursive: true, force: true }

function ensure (result: ReturnType<typeof spawnSync>) {
  if (result.status !== 0) {
    throw new Error('Command fails.')
  }
  return result
}

function patch (path: string, patchFile: string) {
  const root = cwd()
  chdir(path)
  const output = ensure(spawnSync('git', [
    'status',
    '--porcelain',
    '-uno',
    '--ignore-submodules'
  ], utf8)).stdout
  if (output.length === 0) {
    ensure(spawnSync('git', [
      'apply',
      `${root}/${patchFile}`
    ]))
  }
  chdir(root)
}

function md5sum (path: string) {
  const content = readFileSync(path)
  return createHash('md5').update(content).digest('hex')
}

/**
 * LocalDownloader loads RIME schema files from the local filesystem
 * instead of downloading from GitHub. This is useful for:
 * - Development and testing of local schemas
 * - Pre-built schemas stored in the repository
 * - Custom schemas that aren't published to GitHub
 */
class LocalDownloader implements FileLoader {
  repo: string
  schemaIds: string[]
  localPath: string
  prefix: string

  /**
   * @param localPath - Path to local directory containing schema files (relative to project root or absolute)
   * @param schemaIds - Array of schema IDs to load (optional)
   */
  constructor (localPath: string, schemaIds?: string[]) {
    this.localPath = localPath
    // Resolve path relative to project root
    this.repo = resolve(cwd(), localPath)
    this.prefix = this.repo
    this.schemaIds = schemaIds || []
  }

  /**
   * Get the prefix/base path for file resolution
   */
  getPrefix (): string {
    return this.prefix
  }

  /**
   * Get the full path for a file
   */
  getURL (file: string): string {
    return join(this.prefix, file)
  }

  /**
   * Load a file from the local filesystem
   * @param file - Filename relative to the localPath
   * @returns Promise resolving to file contents as Uint8Array
   */
  async loadFile (file: string): Promise<Uint8Array> {
    const filePath = this.getURL(file)
    try {
      const content = readFileSync(filePath)
      return new Uint8Array(content)
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
        throw new Error(`Local file not found: ${filePath}`)
      }
      throw error
    }
  }
}

export {
  utf8,
  rf,
  ensure,
  patch,
  md5sum,
  LocalDownloader
}
