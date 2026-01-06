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

  /**
   * 是否启用压缩
   * @default false
   */
  compress?: boolean

  /**
   * 压缩阈值（字节）
   * @default 5120 (5KB)
   */
  compressionThreshold?: number

  /**
   * 自定义序列化函数
   */
  serialize?: (data: unknown) => string

  /**
   * 自定义反序列化函数
   */
  deserialize?: (raw: string) => unknown
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
  /** 是否已压缩 */
  compressed?: boolean
  /** 数据校验和 */
  checksum?: string
}

/**
 * 缓存元数据
 */
export interface CacheMetadata {
  /** 缓存键 */
  key: string
  /** 创建时间 */
  timestamp: number
  /** 最后访问时间 */
  lastAccess: number
  /** 访问次数 */
  accessCount: number
  /** 数据大小（字节） */
  size: number
  /** 是否已过期 */
  expired: boolean
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
const CACHE_VERSION = '1.1.0'

/**
 * 书签缓存管理器
 * 提供书签数据的缓存和持久化功能，支持 LRU 淘汰策略
 *
 * @example
 * ```ts
 * // 基础用法
 * const cache = new BookmarkCache({ storageKey: 'my-bookmarks' })
 * cache.save(bookmarks)
 * const loaded = cache.load()
 *
 * // 带压缩的缓存
 * const compressedCache = new BookmarkCache({
 *   compress: true,
 *   compressionThreshold: 1024,
 * })
 * ```
 */
export class BookmarkCache {
  /** 配置 */
  private config: Required<Omit<BookmarkCacheConfig, 'serialize' | 'deserialize'>> & Pick<BookmarkCacheConfig, 'serialize' | 'deserialize'>

  /** 内存缓存 Map */
  private memoryCache: Map<string, LRUNode> = new Map()

  /** LRU 链表头节点 */
  private head: LRUNode | null = null

  /** LRU 链表尾节点 */
  private tail: LRUNode | null = null

  /** 当前缓存大小 */
  private currentSize = 0

  /** 缓存命中统计 */
  private hitCount = 0

  /** 缓存未命中统计 */
  private missCount = 0

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
      compress: config.compress ?? false,
      compressionThreshold: config.compressionThreshold ?? 5120,
      serialize: config.serialize,
      deserialize: config.deserialize,
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
   * @returns 缓存统计
   */
  getStats(): {
    /** 当前缓存条目数 */
    size: number
    /** 最大缓存条目数 */
    maxSize: number
    /** 缓存命中率 */
    hitRate: number
    /** 命中次数 */
    hits: number
    /** 未命中次数 */
    misses: number
    /** 总内存使用（估算，字节） */
    memoryUsage: number
  } {
    return {
      size: this.currentSize,
      maxSize: this.config.maxSize,
      hitRate: this.calculateHitRate(),
      hits: this.hitCount,
      misses: this.missCount,
      memoryUsage: this.estimateMemoryUsage(),
    }
  }

  /**
   * 获取所有缓存的元数据
   * @returns 缓存元数据列表
   */
  getMetadata(): CacheMetadata[] {
    const metadata: CacheMetadata[] = []

    this.memoryCache.forEach((node, key) => {
      const data = node.value
      metadata.push({
        key,
        timestamp: data.timestamp,
        lastAccess: data.lastAccess || data.timestamp,
        accessCount: data.accessCount || 0,
        size: this.estimateDataSize(data),
        expired: !this.isValid(data),
      })
    })

    return metadata
  }

  /**
   * 设置缓存并返回是否成功
   * @param items - 书签数据
   * @param key - 缓存键
   * @returns 是否保存成功
   */
  set(items: BookmarkItem[], key?: string): boolean {
    try {
      this.save(items, key)
      return true
    }
    catch {
      return false
    }
  }

  /**
   * 获取缓存，如果不存在则使用工厂函数创建
   * @param key - 缓存键
   * @param factory - 工厂函数
   * @returns 书签数据
   */
  getOrSet(key: string, factory: () => BookmarkItem[]): BookmarkItem[] {
    const cached = this.load(key)
    if (cached !== null) {
      return cached
    }

    const items = factory()
    this.save(items, key)
    return items
  }

  /**
   * 异步获取或设置缓存
   * @param key - 缓存键
   * @param factory - 异步工厂函数
   * @returns 书签数据
   */
  async getOrSetAsync(key: string, factory: () => Promise<BookmarkItem[]>): Promise<BookmarkItem[]> {
    const cached = this.load(key)
    if (cached !== null) {
      return cached
    }

    const items = await factory()
    this.save(items, key)
    return items
  }

  /**
   * 批量保存多个缓存
   * @param entries - 键值对数组
   */
  saveMany(entries: Array<{ key: string, items: BookmarkItem[] }>): void {
    for (const entry of entries) {
      this.save(entry.items, entry.key)
    }
  }

  /**
   * 批量加载多个缓存
   * @param keys - 缓存键数组
   * @returns 键值对 Map
   */
  loadMany(keys: string[]): Map<string, BookmarkItem[] | null> {
    const result = new Map<string, BookmarkItem[] | null>()
    for (const key of keys) {
      result.set(key, this.load(key))
    }
    return result
  }

  /**
   * 清理过期缓存
   * @returns 清理的条目数
   */
  cleanup(): number {
    let cleaned = 0

    // 内存缓存清理
    const keysToDelete: string[] = []
    this.memoryCache.forEach((node, key) => {
      if (!this.isValid(node.value)) {
        keysToDelete.push(key)
      }
    })

    for (const key of keysToDelete) {
      this.clear(key)
      cleaned++
    }

    // 存储清理
    if (this.config.storage !== 'memory') {
      try {
        const storage = this.getStorage()
        if (storage) {
          const storageKeys: string[] = []
          for (let i = 0; i < storage.length; i++) {
            const key = storage.key(i)
            if (key?.startsWith(this.config.storageKey)) {
              storageKeys.push(key)
            }
          }

          for (const key of storageKeys) {
            const raw = storage.getItem(key)
            if (raw) {
              try {
                const data = this.deserialize(raw)
                if (!this.isValid(data)) {
                  storage.removeItem(key)
                  cleaned++
                }
              }
              catch {
                // 解析失败的也清理掉
                storage.removeItem(key)
                cleaned++
              }
            }
          }
        }
      }
      catch (error) {
        console.error('[BookmarkCache] Cleanup failed:', error)
      }
    }

    return cleaned
  }

  /**
   * 重置统计信息
   */
  resetStats(): void {
    this.hitCount = 0
    this.missCount = 0
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
   * @param data - 缓存数据
   * @returns 序列化字符串
   */
  private serialize(data: CacheData): string {
    // 使用自定义序列化函数
    if (this.config.serialize) {
      return this.config.serialize(data)
    }

    // 基础序列化
    let serialized = JSON.stringify(data)

    // 压缩处理
    if (this.config.compress && serialized.length > this.config.compressionThreshold) {
      serialized = this.compress(serialized)
      // 添加压缩标记
      serialized = `__compressed__${serialized}`
    }

    return serialized
  }

  /**
   * 反序列化缓存数据
   * @param raw - 原始字符串
   * @returns 缓存数据
   */
  private deserialize(raw: string): CacheData {
    // 使用自定义反序列化函数
    if (this.config.deserialize) {
      return this.config.deserialize(raw) as CacheData
    }

    // 检查是否压缩
    if (raw.startsWith('__compressed__')) {
      raw = this.decompress(raw.slice(14))
    }

    return JSON.parse(raw)
  }

  /**
   * 简单压缩（使用 LZString 风格的 Base64 编码）
   * @description 生产环境建议使用 pako 或 lz-string 库
   * @param str - 原始字符串
   * @returns 压缩后的字符串
   */
  private compress(str: string): string {
    // 简单的 Unicode 编码压缩
    // 实际项目中建议使用 lz-string 或 pako
    try {
      if (typeof btoa === 'function') {
        return btoa(encodeURIComponent(str))
      }
    }
    catch {
      // 降级处理
    }
    return str
  }

  /**
   * 解压缩
   * @param str - 压缩字符串
   * @returns 原始字符串
   */
  private decompress(str: string): string {
    try {
      if (typeof atob === 'function') {
        return decodeURIComponent(atob(str))
      }
    }
    catch {
      // 降级处理
    }
    return str
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
   * @returns 命中率 (0-1)
   */
  private calculateHitRate(): number {
    const total = this.hitCount + this.missCount
    return total > 0 ? this.hitCount / total : 0
  }

  /**
   * 估算数据大小
   * @param data - 缓存数据
   * @returns 估算的字节数
   */
  private estimateDataSize(data: CacheData): number {
    try {
      return JSON.stringify(data).length * 2 // UTF-16
    }
    catch {
      return 0
    }
  }

  /**
   * 估算总内存使用
   * @returns 估算的字节数
   */
  private estimateMemoryUsage(): number {
    let total = 0
    this.memoryCache.forEach((node) => {
      total += this.estimateDataSize(node.value)
    })
    return total
  }

  /**
   * 从内存缓存加载（更新命中统计）
   */
  private loadFromMemory(key: string): BookmarkItem[] | null {
    const node = this.memoryCache.get(key)
    if (!node) {
      this.missCount++
      return null
    }

    // 移到链表头部（最近使用）
    this.moveToHead(node)
    this.hitCount++

    return this.validateAndReturn(node.value)
  }
}
