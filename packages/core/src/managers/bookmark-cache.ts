/**
 * 书签缓存管理器
 * 管理书签的缓存和持久化
 * @module managers/bookmark-cache
 */

import type { BookmarkItem } from '../types'

/**
 * 缓存配置
 */
export interface BookmarkCacheConfig {
  /**
   * 存储键名
   * @default 'ldesign-bookmarks'
   */
  storageKey?: string

  /**
   * 缓存过期时间（毫秒）
   * @default -1 表示永不过期
   */
  ttl?: number

  /**
   * 存储类型
   * @default 'localStorage'
   */
  storage?: 'localStorage' | 'sessionStorage' | 'memory'
}

/**
 * 缓存数据结构
 */
interface CacheData {
  /** 书签数据 */
  items: BookmarkItem[]
  /** 缓存时间戳 */
  timestamp: number
  /** 版本号 */
  version: string
}

/** 当前缓存版本 */
const CACHE_VERSION = '1.0.0'

/**
 * 书签缓存管理器
 * 提供书签数据的缓存和持久化功能
 */
export class BookmarkCache {
  /** 配置 */
  private config: Required<BookmarkCacheConfig>

  /** 内存缓存 */
  private memoryCache: Map<string, CacheData> = new Map()

  /**
   * 创建缓存管理器
   * @param config - 缓存配置
   */
  constructor(config: BookmarkCacheConfig = {}) {
    this.config = {
      storageKey: config.storageKey ?? 'ldesign-bookmarks',
      ttl: config.ttl ?? -1,
      storage: config.storage ?? 'localStorage',
    }
  }

  /**
   * 保存书签数据到缓存
   * @param items - 书签数据
   * @param key - 缓存键（可选，默认使用配置的 storageKey）
   */
  save(items: BookmarkItem[], key?: string): void {
    const cacheKey = key ?? this.config.storageKey
    const data: CacheData = {
      items,
      timestamp: Date.now(),
      version: CACHE_VERSION,
    }

    if (this.config.storage === 'memory') {
      this.memoryCache.set(cacheKey, data)
      return
    }

    try {
      const storage = this.getStorage()
      if (storage) {
        storage.setItem(cacheKey, JSON.stringify(data))
      }
    }
    catch (error) {
      console.error('[BookmarkCache] Failed to save cache:', error)
      // 降级到内存缓存
      this.memoryCache.set(cacheKey, data)
    }
  }

  /**
   * 从缓存加载书签数据
   * @param key - 缓存键（可选，默认使用配置的 storageKey）
   * @returns 书签数据，如果不存在或已过期则返回 null
   */
  load(key?: string): BookmarkItem[] | null {
    const cacheKey = key ?? this.config.storageKey

    if (this.config.storage === 'memory') {
      return this.loadFromMemory(cacheKey)
    }

    try {
      const storage = this.getStorage()
      if (!storage) {
        return this.loadFromMemory(cacheKey)
      }

      const raw = storage.getItem(cacheKey)
      if (!raw) {
        return null
      }

      const data: CacheData = JSON.parse(raw)
      return this.validateAndReturn(data)
    }
    catch (error) {
      console.error('[BookmarkCache] Failed to load cache:', error)
      return null
    }
  }

  /**
   * 清除缓存
   * @param key - 缓存键（可选，默认使用配置的 storageKey）
   */
  clear(key?: string): void {
    const cacheKey = key ?? this.config.storageKey

    this.memoryCache.delete(cacheKey)

    if (this.config.storage !== 'memory') {
      try {
        const storage = this.getStorage()
        if (storage) {
          storage.removeItem(cacheKey)
        }
      }
      catch (error) {
        console.error('[BookmarkCache] Failed to clear cache:', error)
      }
    }
  }

  /**
   * 检查缓存是否存在
   * @param key - 缓存键（可选，默认使用配置的 storageKey）
   * @returns 是否存在有效缓存
   */
  has(key?: string): boolean {
    return this.load(key) !== null
  }

  /**
   * 获取存储对象
   */
  private getStorage(): Storage | null {
    if (typeof window === 'undefined') {
      return null
    }

    return this.config.storage === 'sessionStorage'
      ? window.sessionStorage
      : window.localStorage
  }

  /**
   * 从内存缓存加载
   */
  private loadFromMemory(key: string): BookmarkItem[] | null {
    const data = this.memoryCache.get(key)
    if (!data) {
      return null
    }
    return this.validateAndReturn(data)
  }

  /**
   * 验证缓存数据并返回
   */
  private validateAndReturn(data: CacheData): BookmarkItem[] | null {
    // 版本检查
    if (data.version !== CACHE_VERSION) {
      return null
    }

    // TTL 检查
    if (this.config.ttl > 0) {
      const age = Date.now() - data.timestamp
      if (age > this.config.ttl) {
        return null
      }
    }

    return data.items
  }
}

