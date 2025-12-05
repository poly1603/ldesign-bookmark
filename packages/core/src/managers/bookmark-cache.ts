/**
 * 书签缓存管理器
 * 管理书签的缓存和持久化，支持 LRU 淘汰策略
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

  /**
   * LRU 缓存最大条目数
   * @default 100
   */
  maxSize?: number

  /**
   * 是否启用缓存预热
   * @default false
   */
  preload?: boolean
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
  /** 访问次数 */
  accessCount?: number
  /** 最后访问时间 */
  lastAccess?: number
}

/**
 * LRU 缓存节点
 */
class LRUNode {
  constructor(
    public key: string,
    public value: CacheData,
    public prev: LRUNode | null = null,
    public next: LRUNode | null = null,
  ) {}
}

/** 当前缓存版本 */
const CACHE_VERSION = '1.0.0'

/**
 * 书签缓存管理器
 * 提供书签数据的缓存和持久化功能，支持 LRU 淘汰策略
 */
export class BookmarkCache {
  /** 配置 */
  private config: Required<BookmarkCacheConfig>

  /** 内存缓存 Map */
  private memoryCache: Map<string, LRUNode> = new Map()

  /** LRU 链表头节点 */
  private head: LRUNode | null = null

  /** LRU 链表尾节点 */
  private tail: LRUNode | null = null

  /** 当前缓存大小 */
  private currentSize = 0

  /**
   * 创建缓存管理器
   * @param config - 缓存配置
   */
  constructor(config: BookmarkCacheConfig = {}) {
    this.config = {
      storageKey: config.storageKey ?? 'ldesign-bookmarks',
      ttl: config.ttl ?? -1,
      storage: config.storage ?? 'localStorage',
      maxSize: config.maxSize ?? 100,
      preload: config.preload ?? false,
    }

    // 如果启用预热，加载缓存
    if (this.config.preload) {
      this.preloadCache()
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
      accessCount: 1,
      lastAccess: Date.now(),
    }

    if (this.config.storage === 'memory') {
      this.setInMemory(cacheKey, data)
      return
    }

    try {
      const storage = this.getStorage()
      if (storage) {
        // 序列化优化：移除不必要的字段
        const serializedData = this.serialize(data)
        storage.setItem(cacheKey, serializedData)
      }
    }
    catch (error) {
      console.error('[BookmarkCache] Failed to save cache:', error)
      // 降级到内存缓存
      this.setInMemory(cacheKey, data)
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

      const data: CacheData = this.deserialize(raw)
      const items = this.validateAndReturn(data)

      // 更新访问统计
      if (items && data) {
        data.accessCount = (data.accessCount || 0) + 1
        data.lastAccess = Date.now()
        this.save(items, cacheKey)
      }

      return items
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

    // 从内存缓存删除
    const node = this.memoryCache.get(cacheKey)
    if (node) {
      this.removeNode(node)
      this.memoryCache.delete(cacheKey)
      this.currentSize--
    }

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
   * 清除所有缓存
   */
  clearAll(): void {
    this.memoryCache.clear()
    this.head = null
    this.tail = null
    this.currentSize = 0

    if (this.config.storage !== 'memory') {
      try {
        const storage = this.getStorage()
        if (storage) {
          // 清除所有以 storageKey 前缀开头的项
          const keys = []
          for (let i = 0; i < storage.length; i++) {
            const key = storage.key(i)
            if (key?.startsWith(this.config.storageKey)) {
              keys.push(key)
            }
          }
          keys.forEach(key => storage.removeItem(key))
        }
      }
      catch (error) {
        console.error('[BookmarkCache] Failed to clear all cache:', error)
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
   * 获取缓存统计信息
   */
  getStats(): {
    size: number
    maxSize: number
    hitRate: number
  } {
    return {
      size: this.currentSize,
      maxSize: this.config.maxSize,
      hitRate: this.calculateHitRate(),
    }
  }

  /**
   * 预热缓存
   */
  private preloadCache(): void {
    try {
      const storage = this.getStorage()
      if (!storage) return

      // 加载主缓存
      const mainKey = this.config.storageKey
      const data = storage.getItem(mainKey)
      if (data) {
        const cacheData: CacheData = this.deserialize(data)
        if (this.isValid(cacheData)) {
          this.setInMemory(mainKey, cacheData)
        }
      }
    }
    catch (error) {
      console.error('[BookmarkCache] Failed to preload cache:', error)
    }
  }

  /**
   * 序列化缓存数据
   */
  private serialize(data: CacheData): string {
    // 可以在这里添加压缩逻辑
    return JSON.stringify(data)
  }

  /**
   * 反序列化缓存数据
   */
  private deserialize(raw: string): CacheData {
    // 可以在这里添加解压缩逻辑
    return JSON.parse(raw)
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
    const node = this.memoryCache.get(key)
    if (!node) {
      return null
    }

    // 移到链表头部（最近使用）
    this.moveToHead(node)

    return this.validateAndReturn(node.value)
  }

  /**
   * 设置到内存缓存（LRU）
   */
  private setInMemory(key: string, data: CacheData): void {
    const existingNode = this.memoryCache.get(key)

    if (existingNode) {
      // 更新已存在的节点
      existingNode.value = data
      this.moveToHead(existingNode)
    }
    else {
      // 创建新节点
      const newNode = new LRUNode(key, data)
      this.memoryCache.set(key, newNode)
      this.addToHead(newNode)
      this.currentSize++

      // 检查是否超过最大容量
      if (this.currentSize > this.config.maxSize) {
        this.evictLRU()
      }
    }
  }

  /**
   * 添加节点到链表头部
   */
  private addToHead(node: LRUNode): void {
    node.next = this.head
    node.prev = null

    if (this.head) {
      this.head.prev = node
    }
    this.head = node

    if (!this.tail) {
      this.tail = node
    }
  }

  /**
   * 移除节点
   */
  private removeNode(node: LRUNode): void {
    if (node.prev) {
      node.prev.next = node.next
    }
    else {
      this.head = node.next
    }

    if (node.next) {
      node.next.prev = node.prev
    }
    else {
      this.tail = node.prev
    }
  }

  /**
   * 移动节点到头部
   */
  private moveToHead(node: LRUNode): void {
    this.removeNode(node)
    this.addToHead(node)
  }

  /**
   * 淘汰最少使用的缓存（LRU）
   */
  private evictLRU(): void {
    if (!this.tail) return

    const evicted = this.tail
    this.removeNode(evicted)
    this.memoryCache.delete(evicted.key)
    this.currentSize--

    console.debug(`[BookmarkCache] Evicted LRU cache: ${evicted.key}`)
  }

  /**
   * 验证缓存数据并返回
   */
  private validateAndReturn(data: CacheData): BookmarkItem[] | null {
    if (!this.isValid(data)) {
      return null
    }
    return data.items
  }

  /**
   * 检查缓存是否有效
   */
  private isValid(data: CacheData): boolean {
    // 版本检查
    if (data.version !== CACHE_VERSION) {
      return false
    }

    // TTL 检查
    if (this.config.ttl > 0) {
      const age = Date.now() - data.timestamp
      if (age > this.config.ttl) {
        return false
      }
    }

    return true
  }

  /**
   * 计算缓存命中率
   */
  private calculateHitRate(): number {
    let totalAccess = 0
    let hits = 0

    this.memoryCache.forEach((node) => {
      if (node.value.accessCount) {
        totalAccess += node.value.accessCount
        if (node.value.accessCount > 1) {
          hits += node.value.accessCount - 1
        }
      }
    })

    return totalAccess > 0 ? hits / totalAccess : 0
  }
}
