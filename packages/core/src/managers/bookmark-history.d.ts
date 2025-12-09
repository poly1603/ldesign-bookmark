/**
 * 书签历史记录管理器
 * 管理书签的访问历史和撤销/重做
 * @module managers/bookmark-history
 */
import type { BookmarkItem } from '../types';
/**
 * 历史记录配置
 */
export interface BookmarkHistoryConfig {
    /**
     * 最大历史记录数量
     * @default 50
     */
    maxHistory?: number;
    /**
     * 最大访问历史数量
     * @default 100
     */
    maxVisitHistory?: number;
}
/**
 * 历史记录项
 */
export interface HistoryEntry {
    /** 操作类型 */
    type: 'add' | 'remove' | 'update' | 'move';
    /** 操作时间戳 */
    timestamp: number;
    /** 操作前的数据快照 */
    before: BookmarkItem[];
    /** 操作后的数据快照 */
    after: BookmarkItem[];
}
/**
 * 访问记录项
 */
export interface VisitEntry {
    /** 书签 ID */
    id: string;
    /** 书签标题 */
    title: string;
    /** 书签 URL */
    url: string;
    /** 访问时间戳 */
    timestamp: number;
}
/**
 * 书签历史记录管理器
 * 提供撤销/重做和访问历史功能
 */
export declare class BookmarkHistory {
    /** 配置 */
    private config;
    /** 历史记录栈 */
    private historyStack;
    /** 当前位置 */
    private currentIndex;
    /** 访问历史 */
    private visitHistory;
    /**
     * 创建历史记录管理器
     * @param config - 历史配置
     */
    constructor(config?: BookmarkHistoryConfig);
    /**
     * 记录操作
     * @param type - 操作类型
     * @param before - 操作前的数据
     * @param after - 操作后的数据
     */
    record(type: HistoryEntry['type'], before: BookmarkItem[], after: BookmarkItem[]): void;
    /**
     * 撤销操作
     * @returns 撤销后的数据，如果不能撤销则返回 null
     */
    undo(): BookmarkItem[] | null;
    /**
     * 重做操作
     * @returns 重做后的数据，如果不能重做则返回 null
     */
    redo(): BookmarkItem[] | null;
    /**
     * 是否可以撤销
     */
    canUndo(): boolean;
    /**
     * 是否可以重做
     */
    canRedo(): boolean;
    /**
     * 清除历史记录
     */
    clearHistory(): void;
    /**
     * 记录访问
     * @param id - 书签 ID
     * @param title - 书签标题
     * @param url - 书签 URL
     */
    recordVisit(id: string, title: string, url: string): void;
    /**
     * 获取访问历史
     * @param limit - 限制数量
     * @returns 访问历史列表
     */
    getVisitHistory(limit?: number): VisitEntry[];
    /**
     * 获取最近访问的书签 ID 列表
     * @param limit - 限制数量
     * @returns 书签 ID 列表
     */
    getRecentIds(limit?: number): string[];
    /**
     * 清除访问历史
     */
    clearVisitHistory(): void;
}
