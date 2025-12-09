/**
 * 书签缓存管理器
 * 管理书签的缓存和持久化，支持 LRU 淘汰策略
 * @module managers/bookmark-cache
 */
import type { BookmarkItem } from '../types';
/**
 * 缓存配置
 */
export interface BookmarkCacheConfig {
    /**
     * 存储键名
     * @default 'ldesign-bookmarks'
     */
    storageKey?: string;
    /**
     * 缓存过期时间（毫秒）
     * @default -1 表示永不过期
     */
    ttl?: number;
    /**
     * 存储类型
     * @default 'localStorage'
     */
    storage?: 'localStorage' | 'sessionStorage' | 'memory';
    /**
     * LRU 缓存最大条目数
     * @default 100
     */
    maxSize?: number;
    /**
     * 是否启用缓存预热
     * @default false
     */
    preload?: boolean;
}
/**
 * 书签缓存管理器
 * 提供书签数据的缓存和持久化功能，支持 LRU 淘汰策略
 */
export declare class BookmarkCache {
    /** 配置 */
    private config;
    /** 内存缓存 Map */
    private memoryCache;
    /** LRU 链表头节点 */
    private head;
    /** LRU 链表尾节点 */
    private tail;
    /** 当前缓存大小 */
    private currentSize;
    /**
     * 创建缓存管理器
     * @param config - 缓存配置
     */
    constructor(config?: BookmarkCacheConfig);
    /**
     * 保存书签数据到缓存
     * @param items - 书签数据
     * @param key - 缓存键（可选，默认使用配置的 storageKey）
     */
    save(items: BookmarkItem[], key?: string): void;
    /**
     * 从缓存加载书签数据
     * @param key - 缓存键（可选，默认使用配置的 storageKey）
     * @returns 书签数据，如果不存在或已过期则返回 null
     */
    load(key?: string): BookmarkItem[] | null;
    /**
     * 清除缓存
     * @param key - 缓存键（可选，默认使用配置的 storageKey）
     */
    clear(key?: string): void;
    /**
     * 清除所有缓存
     */
    clearAll(): void;
    /**
     * 检查缓存是否存在
     * @param key - 缓存键（可选，默认使用配置的 storageKey）
     * @returns 是否存在有效缓存
     */
    has(key?: string): boolean;
    /**
     * 获取缓存统计信息
     */
    getStats(): {
        size: number;
        maxSize: number;
        hitRate: number;
    };
    /**
     * 预热缓存
     */
    private preloadCache;
    /**
     * 序列化缓存数据
     */
    private serialize;
    /**
     * 反序列化缓存数据
     */
    private deserialize;
    /**
     * 获取存储对象
     */
    private getStorage;
    /**
     * 从内存缓存加载
     */
    private loadFromMemory;
    /**
     * 设置到内存缓存（LRU）
     */
    private setInMemory;
    /**
     * 添加节点到链表头部
     */
    private addToHead;
    /**
     * 移除节点
     */
    private removeNode;
    /**
     * 移动节点到头部
     */
    private moveToHead;
    /**
     * 淘汰最少使用的缓存（LRU）
     */
    private evictLRU;
    /**
     * 验证缓存数据并返回
     */
    private validateAndReturn;
    /**
     * 检查缓存是否有效
     */
    private isValid;
    /**
     * 计算缓存命中率
     */
    private calculateHitRate;
}
