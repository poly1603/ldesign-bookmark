/**
 * 书签索引管理器
 * 使用 Map 提供 O(1) 的查找性能
 * @module utils/bookmark-index
 */

import type { BookmarkItem, BookmarkLeafItem, BookmarkFolderItem } from '../types'
import { getItemId, isFolder, isBookmark } from './bookmark-utils'

/**
 * 搜索选项
 */
export interface SearchOptions {
  /** 是否区分大小写 */
  caseSensitive?: boolean
  /** 是否使用模糊匹配 */
  fuzzy?: boolean
  /** 最大结果数 */
  limit?: number
  /** 搜索类型 */
  searchIn?: ('title' | 'url' | 'tags' | 'description')[]
  /** 是否只搜索书签（排除文件夹） */
  bookmarksOnly?: boolean
  /** 是否只搜索文件夹 */
  foldersOnly?: boolean
}

/**
 * 搜索结果
 */
export interface SearchResult {
  /** 匹配的书签项 */
  item: BookmarkItem
  /** 匹配分数 (0-1) */
  score: number
  /** 匹配的字段 */
  matchedFields: string[]
  /** 高亮位置 */
  highlights?: { field: string, ranges: [number, number][] }[]
}

/**
 * 书签索引类
 * 提供快速查找、搜索和缓存功能
 *
 * @example
 * ```ts
 * const index = new BookmarkIndex()
 * index.build(bookmarks)
 *
 * // 快速查找
 * const item = index.get('bookmark-id')
 *
 * // 模糊搜索
 * const results = index.search('github', { fuzzy: true, limit: 10 })
 *
 * // 按标签查找
 * const tagged = index.findByTag('dev')
 * ```
 */
export class BookmarkIndex {
  /** ID 到书签项的映射 */
  private itemMap = new Map<string, BookmarkItem>()

  /** ID 到父级 ID 的映射 */
  private parentMap = new Map<string, string>()

  /** ID 到路径的映射 */
  private pathMap = new Map<string, string[]>()

  /** 标签索引：标签 -> ID 集合 */
  private tagIndex = new Map<string, Set<string>>()

  /** URL 索引：URL -> ID */
  private urlIndex = new Map<string, string>()

  /** 子项索引：父级 ID -> 子项 ID 列表 */
  private childrenIndex = new Map<string, string[]>()

  /**
   * 构建索引
   * @param items - 书签列表
   */
  build(items: BookmarkItem[]): void {
    this.clear()
    this.buildRecursive(items, undefined, [])
  }

  /**
   * 递归构建索引
   */
  private buildRecursive(
    items: BookmarkItem[],
    parentId: string | undefined,
    path: string[],
  ): void {
    const childIds: string[] = []

    for (const item of items) {
      const id = getItemId(item)
      if (!id) continue

      childIds.push(id)

      // 构建 ID 映射
      this.itemMap.set(id, item)

      // 构建父级映射
      if (parentId) {
        this.parentMap.set(id, parentId)
      }

      // 构建路径映射
      const currentPath = [...path, id]
      this.pathMap.set(id, currentPath)

      // 构建标签索引
      if ('tags' in item && Array.isArray(item.tags)) {
        for (const tag of item.tags) {
          const tagLower = tag.toLowerCase()
          if (!this.tagIndex.has(tagLower)) {
            this.tagIndex.set(tagLower, new Set())
          }
          this.tagIndex.get(tagLower)!.add(id)
        }
      }

      // 构建 URL 索引
      if (isBookmark(item) && item.url) {
        this.urlIndex.set(item.url, id)
      }

      // 递归处理子项
      if (isFolder(item) && item.children) {
        this.buildRecursive(item.children, id, currentPath)
      }
    }

    // 构建子项索引
    if (parentId && childIds.length > 0) {
      this.childrenIndex.set(parentId, childIds)
    }
  }

  /**
   * 根据 ID 查找书签项 - O(1) 时间复杂度
   * @param id - 书签 ID
   * @returns 书签项
   */
  get(id: string): BookmarkItem | undefined {
    return this.itemMap.get(id)
  }

  /**
   * 获取父级 ID
   * @param id - 书签 ID
   * @returns 父级 ID
   */
  getParentId(id: string): string | undefined {
    return this.parentMap.get(id)
  }

  /**
   * 获取所有父级 ID 列表
   * @param id - 书签 ID
   * @returns 父级 ID 列表
   */
  getParentIds(id: string): string[] {
    const parents: string[] = []
    let currentId: string | undefined = id

    while (currentId) {
      currentId = this.parentMap.get(currentId)
      if (currentId) {
        parents.unshift(currentId)
      }
    }

    return parents
  }

  /**
   * 获取路径
   * @param id - 书签 ID
   * @returns 路径 ID 数组
   */
  getPath(id: string): string[] {
    return this.pathMap.get(id) || []
  }

  /**
   * 检查是否存在
   * @param id - 书签 ID
   * @returns 是否存在
   */
  has(id: string): boolean {
    return this.itemMap.has(id)
  }

  /**
   * 获取所有 ID
   * @returns ID 数组
   */
  getAllIds(): string[] {
    return Array.from(this.itemMap.keys())
  }

  /**
   * 获取索引大小
   * @returns 索引中的项数
   */
  get size(): number {
    return this.itemMap.size
  }

  /**
   * 清除索引
   */
  clear(): void {
    this.itemMap.clear()
    this.parentMap.clear()
    this.pathMap.clear()
    this.tagIndex.clear()
    this.urlIndex.clear()
    this.childrenIndex.clear()
  }

  /**
   * 更新单个项
   * @param id - 书签 ID
   * @param item - 新的书签项
   */
  update(id: string, item: BookmarkItem): void {
    const oldItem = this.itemMap.get(id)
    if (!oldItem) return

    // 更新标签索引
    if ('tags' in oldItem && Array.isArray(oldItem.tags)) {
      for (const tag of oldItem.tags) {
        this.tagIndex.get(tag.toLowerCase())?.delete(id)
      }
    }
    if ('tags' in item && Array.isArray((item as BookmarkLeafItem).tags)) {
      for (const tag of (item as BookmarkLeafItem).tags!) {
        const tagLower = tag.toLowerCase()
        if (!this.tagIndex.has(tagLower)) {
          this.tagIndex.set(tagLower, new Set())
        }
        this.tagIndex.get(tagLower)!.add(id)
      }
    }

    // 更新 URL 索引
    if (isBookmark(oldItem) && oldItem.url) {
      this.urlIndex.delete(oldItem.url)
    }
    if (isBookmark(item) && item.url) {
      this.urlIndex.set(item.url, id)
    }

    this.itemMap.set(id, item)
  }

  /**
   * 删除项
   * @param id - 书签 ID
   * @param recursive - 是否递归删除子项
   */
  delete(id: string, recursive = true): void {
    const item = this.itemMap.get(id)
    if (!item) return

    // 删除标签索引
    if ('tags' in item && Array.isArray(item.tags)) {
      for (const tag of item.tags) {
        this.tagIndex.get(tag.toLowerCase())?.delete(id)
      }
    }

    // 删除 URL 索引
    if (isBookmark(item) && item.url) {
      this.urlIndex.delete(item.url)
    }

    // 递归删除子项
    if (recursive && isFolder(item)) {
      const childIds = this.childrenIndex.get(id) || []
      for (const childId of childIds) {
        this.delete(childId, true)
      }
    }

    // 从父级的子项列表中移除
    const parentId = this.parentMap.get(id)
    if (parentId) {
      const siblings = this.childrenIndex.get(parentId)
      if (siblings) {
        const index = siblings.indexOf(id)
        if (index !== -1) siblings.splice(index, 1)
      }
    }

    this.itemMap.delete(id)
    this.parentMap.delete(id)
    this.pathMap.delete(id)
    this.childrenIndex.delete(id)
  }

  // ==================== 搜索功能 ====================

  /**
   * 搜索书签
   * @param query - 搜索关键词
   * @param options - 搜索选项
   * @returns 搜索结果
   */
  search(query: string, options: SearchOptions = {}): SearchResult[] {
    const {
      caseSensitive = false,
      fuzzy = false,
      limit = 50,
      searchIn = ['title', 'url'],
      bookmarksOnly = false,
      foldersOnly = false,
    } = options

    const results: SearchResult[] = []
    const normalizedQuery = caseSensitive ? query : query.toLowerCase()

    for (const [, item] of this.itemMap) {
      // 类型过滤
      if (bookmarksOnly && !isBookmark(item)) continue
      if (foldersOnly && !isFolder(item)) continue

      const matchedFields: string[] = []
      let totalScore = 0

      // 搜索标题
      if (searchIn.includes('title') && 'title' in item) {
        const title = caseSensitive ? item.title : item.title.toLowerCase()
        const score = fuzzy
          ? this.fuzzyMatch(normalizedQuery, title)
          : this.exactMatch(normalizedQuery, title)
        if (score > 0) {
          matchedFields.push('title')
          totalScore += score * 1.5 // 标题权重更高
        }
      }

      // 搜索 URL
      if (searchIn.includes('url') && isBookmark(item) && item.url) {
        const url = caseSensitive ? item.url : item.url.toLowerCase()
        const score = fuzzy
          ? this.fuzzyMatch(normalizedQuery, url)
          : this.exactMatch(normalizedQuery, url)
        if (score > 0) {
          matchedFields.push('url')
          totalScore += score
        }
      }

      // 搜索标签
      if (searchIn.includes('tags') && 'tags' in item && Array.isArray(item.tags)) {
        for (const tag of item.tags) {
          const normalizedTag = caseSensitive ? tag : tag.toLowerCase()
          if (normalizedTag.includes(normalizedQuery)) {
            matchedFields.push('tags')
            totalScore += 1
            break
          }
        }
      }

      // 搜索描述
      if (searchIn.includes('description') && 'description' in item && item.description) {
        const desc = caseSensitive ? item.description : item.description.toLowerCase()
        const score = fuzzy
          ? this.fuzzyMatch(normalizedQuery, desc)
          : this.exactMatch(normalizedQuery, desc)
        if (score > 0) {
          matchedFields.push('description')
          totalScore += score * 0.5
        }
      }

      if (matchedFields.length > 0) {
        results.push({
          item,
          score: totalScore / matchedFields.length,
          matchedFields,
        })
      }
    }

    // 按分数排序
    results.sort((a, b) => b.score - a.score)

    return results.slice(0, limit)
  }

  /**
   * 精确匹配
   */
  private exactMatch(query: string, text: string): number {
    if (!text) return 0
    const index = text.indexOf(query)
    if (index === -1) return 0
    // 开头匹配分数更高
    return index === 0 ? 1 : 0.8
  }

  /**
   * 模糊匹配（简化版本）
   * 使用简单的子序列匹配算法
   */
  private fuzzyMatch(query: string, text: string): number {
    if (!text || !query) return 0

    let queryIndex = 0
    let textIndex = 0
    let matched = 0
    let consecutiveMatches = 0
    let maxConsecutive = 0

    while (queryIndex < query.length && textIndex < text.length) {
      if (query[queryIndex] === text[textIndex]) {
        matched++
        consecutiveMatches++
        maxConsecutive = Math.max(maxConsecutive, consecutiveMatches)
        queryIndex++
      }
      else {
        consecutiveMatches = 0
      }
      textIndex++
    }

    if (queryIndex < query.length) return 0 // 未完全匹配

    // 计算分数：考虑匹配率和连续匹配
    const matchRatio = matched / query.length
    const consecutiveBonus = maxConsecutive / query.length
    const lengthPenalty = Math.min(1, query.length / text.length)

    return matchRatio * 0.5 + consecutiveBonus * 0.3 + lengthPenalty * 0.2
  }

  // ==================== 标签查询 ====================

  /**
   * 按标签查找书签
   * @param tag - 标签名
   * @returns 书签列表
   */
  findByTag(tag: string): BookmarkItem[] {
    const ids = this.tagIndex.get(tag.toLowerCase())
    if (!ids) return []
    return Array.from(ids)
      .map(id => this.itemMap.get(id))
      .filter((item): item is BookmarkItem => item !== undefined)
  }

  /**
   * 按多个标签查找（AND 关系）
   * @param tags - 标签列表
   * @returns 书签列表
   */
  findByTags(tags: string[]): BookmarkItem[] {
    if (tags.length === 0) return []

    const tagSets = tags
      .map(tag => this.tagIndex.get(tag.toLowerCase()))
      .filter((set): set is Set<string> => set !== undefined)

    if (tagSets.length !== tags.length) return [] // 某个标签不存在

    // 求交集
    const [first, ...rest] = tagSets
    const intersection = new Set(
      Array.from(first).filter(id =>
        rest.every(set => set.has(id)),
      ),
    )

    return Array.from(intersection)
      .map(id => this.itemMap.get(id))
      .filter((item): item is BookmarkItem => item !== undefined)
  }

  /**
   * 获取所有标签
   * @returns 标签列表（带计数）
   */
  getAllTags(): Array<{ tag: string, count: number }> {
    return Array.from(this.tagIndex.entries())
      .map(([tag, ids]) => ({ tag, count: ids.size }))
      .sort((a, b) => b.count - a.count)
  }

  // ==================== URL 查询 ====================

  /**
   * 按 URL 查找书签
   * @param url - URL
   * @returns 书签项
   */
  findByUrl(url: string): BookmarkItem | undefined {
    const id = this.urlIndex.get(url)
    return id ? this.itemMap.get(id) : undefined
  }

  /**
   * 检查 URL 是否已存在
   * @param url - URL
   * @returns 是否存在
   */
  hasUrl(url: string): boolean {
    return this.urlIndex.has(url)
  }

  // ==================== 子树查询 ====================

  /**
   * 获取直接子项
   * @param parentId - 父级 ID
   * @returns 子项列表
   */
  getChildren(parentId: string): BookmarkItem[] {
    const childIds = this.childrenIndex.get(parentId) || []
    return childIds
      .map(id => this.itemMap.get(id))
      .filter((item): item is BookmarkItem => item !== undefined)
  }

  /**
   * 获取所有后代（递归）
   * @param parentId - 父级 ID
   * @returns 所有后代列表
   */
  getDescendants(parentId: string): BookmarkItem[] {
    const result: BookmarkItem[] = []

    const collect = (id: string) => {
      const childIds = this.childrenIndex.get(id) || []
      for (const childId of childIds) {
        const item = this.itemMap.get(childId)
        if (item) {
          result.push(item)
          if (isFolder(item)) {
            collect(childId)
          }
        }
      }
    }

    collect(parentId)
    return result
  }

  /**
   * 获取子树统计
   * @param parentId - 父级 ID
   * @returns 统计信息
   */
  getSubtreeStats(parentId: string): {
    totalCount: number
    bookmarkCount: number
    folderCount: number
    depth: number
  } {
    let bookmarkCount = 0
    let folderCount = 0
    let maxDepth = 0

    const traverse = (id: string, depth: number) => {
      maxDepth = Math.max(maxDepth, depth)
      const childIds = this.childrenIndex.get(id) || []

      for (const childId of childIds) {
        const item = this.itemMap.get(childId)
        if (!item) continue

        if (isFolder(item)) {
          folderCount++
          traverse(childId, depth + 1)
        }
        else if (isBookmark(item)) {
          bookmarkCount++
        }
      }
    }

    traverse(parentId, 0)

    return {
      totalCount: bookmarkCount + folderCount,
      bookmarkCount,
      folderCount,
      depth: maxDepth,
    }
  }

  // ==================== 其他查询 ====================

  /**
   * 获取所有文件夹
   * @returns 文件夹列表
   */
  getAllFolders(): BookmarkFolderItem[] {
    return Array.from(this.itemMap.values())
      .filter(isFolder) as BookmarkFolderItem[]
  }

  /**
   * 获取所有书签（排除文件夹）
   * @returns 书签列表
   */
  getAllBookmarks(): BookmarkLeafItem[] {
    return Array.from(this.itemMap.values())
      .filter(isBookmark) as BookmarkLeafItem[]
  }

  /**
   * 获取最近添加的书签
   * @param limit - 数量限制
   * @returns 书签列表
   */
  getRecent(limit = 10): BookmarkItem[] {
    return Array.from(this.itemMap.values())
      .filter(item => 'createdAt' in item && typeof item.createdAt === 'number')
      .sort((a, b) => {
        const aTime = 'createdAt' in a ? (a.createdAt || 0) : 0
        const bTime = 'createdAt' in b ? (b.createdAt || 0) : 0
        return bTime - aTime
      })
      .slice(0, limit)
  }

  /**
   * 获取访问最多的书签
   * @param limit - 数量限制
   * @returns 书签列表
   */
  getMostVisited(limit = 10): BookmarkLeafItem[] {
    return this.getAllBookmarks()
      .filter(item => typeof item.visitCount === 'number')
      .sort((a, b) => (b.visitCount || 0) - (a.visitCount || 0))
      .slice(0, limit)
  }
}
