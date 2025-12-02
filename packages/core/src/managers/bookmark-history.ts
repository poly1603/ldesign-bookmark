/**
 * 书签历史记录管理器
 * 管理书签的访问历史和撤销/重做
 * @module managers/bookmark-history
 */

import type { BookmarkItem } from '../types'

/**
 * 历史记录配置
 */
export interface BookmarkHistoryConfig {
  /**
   * 最大历史记录数量
   * @default 50
   */
  maxHistory?: number

  /**
   * 最大访问历史数量
   * @default 100
   */
  maxVisitHistory?: number
}

/**
 * 历史记录项
 */
export interface HistoryEntry {
  /** 操作类型 */
  type: 'add' | 'remove' | 'update' | 'move'
  /** 操作时间戳 */
  timestamp: number
  /** 操作前的数据快照 */
  before: BookmarkItem[]
  /** 操作后的数据快照 */
  after: BookmarkItem[]
}

/**
 * 访问记录项
 */
export interface VisitEntry {
  /** 书签 ID */
  id: string
  /** 书签标题 */
  title: string
  /** 书签 URL */
  url: string
  /** 访问时间戳 */
  timestamp: number
}

/**
 * 书签历史记录管理器
 * 提供撤销/重做和访问历史功能
 */
export class BookmarkHistory {
  /** 配置 */
  private config: Required<BookmarkHistoryConfig>

  /** 历史记录栈 */
  private historyStack: HistoryEntry[] = []

  /** 当前位置 */
  private currentIndex = -1

  /** 访问历史 */
  private visitHistory: VisitEntry[] = []

  /**
   * 创建历史记录管理器
   * @param config - 历史配置
   */
  constructor(config: BookmarkHistoryConfig = {}) {
    this.config = {
      maxHistory: config.maxHistory ?? 50,
      maxVisitHistory: config.maxVisitHistory ?? 100,
    }
  }

  /**
   * 记录操作
   * @param type - 操作类型
   * @param before - 操作前的数据
   * @param after - 操作后的数据
   */
  record(type: HistoryEntry['type'], before: BookmarkItem[], after: BookmarkItem[]): void {
    // 如果当前不在最新位置，截断后面的历史
    if (this.currentIndex < this.historyStack.length - 1) {
      this.historyStack = this.historyStack.slice(0, this.currentIndex + 1)
    }

    // 添加新记录
    this.historyStack.push({
      type,
      timestamp: Date.now(),
      before: JSON.parse(JSON.stringify(before)),
      after: JSON.parse(JSON.stringify(after)),
    })

    // 限制历史记录数量
    if (this.historyStack.length > this.config.maxHistory) {
      this.historyStack.shift()
    }
    else {
      this.currentIndex++
    }
  }

  /**
   * 撤销操作
   * @returns 撤销后的数据，如果不能撤销则返回 null
   */
  undo(): BookmarkItem[] | null {
    if (!this.canUndo()) {
      return null
    }

    const entry = this.historyStack[this.currentIndex]
    this.currentIndex--

    return JSON.parse(JSON.stringify(entry.before))
  }

  /**
   * 重做操作
   * @returns 重做后的数据，如果不能重做则返回 null
   */
  redo(): BookmarkItem[] | null {
    if (!this.canRedo()) {
      return null
    }

    this.currentIndex++
    const entry = this.historyStack[this.currentIndex]

    return JSON.parse(JSON.stringify(entry.after))
  }

  /**
   * 是否可以撤销
   */
  canUndo(): boolean {
    return this.currentIndex >= 0
  }

  /**
   * 是否可以重做
   */
  canRedo(): boolean {
    return this.currentIndex < this.historyStack.length - 1
  }

  /**
   * 清除历史记录
   */
  clearHistory(): void {
    this.historyStack = []
    this.currentIndex = -1
  }

  /**
   * 记录访问
   * @param id - 书签 ID
   * @param title - 书签标题
   * @param url - 书签 URL
   */
  recordVisit(id: string, title: string, url: string): void {
    this.visitHistory.unshift({
      id,
      title,
      url,
      timestamp: Date.now(),
    })

    // 限制访问历史数量
    if (this.visitHistory.length > this.config.maxVisitHistory) {
      this.visitHistory.pop()
    }
  }

  /**
   * 获取访问历史
   * @param limit - 限制数量
   * @returns 访问历史列表
   */
  getVisitHistory(limit?: number): VisitEntry[] {
    if (limit !== undefined && limit > 0) {
      return this.visitHistory.slice(0, limit)
    }
    return [...this.visitHistory]
  }

  /**
   * 获取最近访问的书签 ID 列表
   * @param limit - 限制数量
   * @returns 书签 ID 列表
   */
  getRecentIds(limit = 10): string[] {
    const seen = new Set<string>()
    const result: string[] = []

    for (const entry of this.visitHistory) {
      if (!seen.has(entry.id)) {
        seen.add(entry.id)
        result.push(entry.id)
        if (result.length >= limit) {
          break
        }
      }
    }

    return result
  }

  /**
   * 清除访问历史
   */
  clearVisitHistory(): void {
    this.visitHistory = []
  }
}

