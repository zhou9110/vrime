// Parse CHANGELOG.zh-CN.md structure
// Format:
// ## [version] - date
// ### Update Title
// Description
// #### Section Name
// - item
// - item

export interface ChangelogItem {
  text: string
}

export interface ChangelogSection {
  name: string // e.g., "新增功能", "改进优化"
  items: ChangelogItem[]
}

export interface ProductUpdate {
  version: string
  date: string
  releasedAt: number // Unix timestamp
  title: string // e.g., "九键输入法、语音输入法正式上线"
  description: string
  sections: ChangelogSection[]
}

export function parseChangelog(markdown: string): ProductUpdate[] {
  const lines = markdown.split('\n')
  const updates: ProductUpdate[] = []
  let currentUpdate: Partial<ProductUpdate> | null = null
  let currentSection: Partial<ChangelogSection> | null = null
  let expectingTitle = false
  let expectingDescription = false

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()

    // Skip empty lines and main title
    if (!line || line.startsWith('# 更新日志') || line.startsWith('本文档记录')) {
      continue
    }

    // Match version line: ## [2.3.1] - 2025-10-27
    const versionMatch = line.match(/^##\s+\[([^\]]+)\]\s+-\s+(.+)/)
    if (versionMatch) {
      // Save previous update if exists
      if (currentUpdate && currentUpdate.version) {
        if (currentSection && currentSection.name) {
          if (!currentUpdate.sections) currentUpdate.sections = []
          currentUpdate.sections.push(currentSection as ChangelogSection)
        }
        updates.push(currentUpdate as ProductUpdate)
      }

      // Start new update
      const [, version, dateStr] = versionMatch
      currentUpdate = {
        version,
        date: dateStr,
        releasedAt: Date.parse(dateStr),
        title: '',
        description: '',
        sections: []
      }
      currentSection = null
      expectingTitle = true
      expectingDescription = false
      continue
    }

    // Match title: ### Update Title
    const titleMatch = line.match(/^###\s+(.+)/)
    if (titleMatch && expectingTitle) {
      currentUpdate!.title = titleMatch[1]
      expectingTitle = false
      expectingDescription = true
      continue
    }

    // Match section: #### 新增功能
    const sectionMatch = line.match(/^####\s+(.+)/)
    if (sectionMatch) {
      // Save previous section
      if (currentSection && currentSection.name) {
        currentUpdate!.sections!.push(currentSection as ChangelogSection)
      }

      // Start new section
      currentSection = {
        name: sectionMatch[1],
        items: []
      }
      expectingDescription = false
      continue
    }

    // Match item: - 九宫格拼音键盘
    const itemMatch = line.match(/^-\s+(.+)/)
    if (itemMatch && currentSection) {
      currentSection.items!.push({ text: itemMatch[1] })
      continue
    }

    // Description line (plain text after title)
    if (expectingDescription && line && !line.startsWith('#')) {
      currentUpdate!.description = line
      expectingDescription = false
      continue
    }
  }

  // Save last update
  if (currentUpdate && currentUpdate.version) {
    if (currentSection && currentSection.name) {
      currentUpdate.sections!.push(currentSection as ChangelogSection)
    }
    updates.push(currentUpdate as ProductUpdate)
  }

  return updates
}

// Storage key for last viewed timestamp
export const LAST_VIEWED_KEY = 'vrime_changelog_last_viewed'

// Get last viewed timestamp from localStorage
export function getLastViewedTimestamp(): number {
  const stored = localStorage.getItem(LAST_VIEWED_KEY)
  return stored ? parseInt(stored, 10) : 0
}

// Update last viewed timestamp
export function markChangelogAsViewed(): void {
  localStorage.setItem(LAST_VIEWED_KEY, Date.now().toString())
}

// Get updates released after a certain timestamp
export function getUnseenUpdates(updates: ProductUpdate[]): ProductUpdate[] {
  const lastViewed = getLastViewedTimestamp()
  return updates.filter(update => update.releasedAt > lastViewed)
}

// Get count of unseen updates
export function getUnseenCount(updates: ProductUpdate[]): number {
  return getUnseenUpdates(updates).length
}

// Check if update is new (released after last viewed)
export function isNewUpdate(update: ProductUpdate): boolean {
  return update.releasedAt > getLastViewedTimestamp()
}
