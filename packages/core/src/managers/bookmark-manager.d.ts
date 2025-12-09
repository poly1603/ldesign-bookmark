/**
 * 书签管理器
 * 核心状态管理和事件处理
 * @module managers/bookmark-manager
 */
import type { BookmarkConfig, BookmarkEventMap, BookmarkFolderItem, BookmarkItem, BookmarkLeafItem, BookmarkState } from '../types';
/**
 * 书签管理器配置
 */
export interface BookmarkManagerConfig extends BookmarkConfig {
    /**
     * 初始选中的书签 ID
     */
    defaultSelectedId?: string;
    /**
     * 初始展开的文件夹 ID 列表
     */
    defaultExpandedIds?: string[];
}
/**
 * 书签管理器
 * 提供书签的核心状态管理和事件处理功能
 */
export declare class BookmarkManager {
    /** 配置 */
    private config;
    /** 书签数据 */
    private items;
    /** 当前状态 */
    private state;
    /** 事件发射器 */
    private emitter;
    /** 书签索引（用于快速查找） */
    private index;
    /**
     * 创建书签管理器
     * @param config - 书签配置
     */
    constructor(config?: BookmarkManagerConfig);
    /**
     * 获取当前配置
     */
    getConfig(): Required<Omit<BookmarkConfig, 'items'>> & {
        items: BookmarkItem[];
    };
    /**
     * 获取书签列表
     */
    getItems(): BookmarkItem[];
    /**
     * 获取当前状态
     */
    getState(): BookmarkState;
    /**
     * 获取选中的书签 ID
     */
    getSelectedId(): string | undefined;
    /**
     * 获取展开的文件夹 ID 列表
     */
    getExpandedIds(): string[];
    /**
     * 选中书签
     * @param id - 书签 ID
     * @param event - 原始事件
     */
    select(id: string, event?: Event): void;
    /**
     * 切换文件夹展开状态
     * @param id - 文件夹 ID
     */
    toggleExpand(id: string): void;
    /**
     * 展开文件夹
     * @param id - 文件夹 ID
     */
    expand(id: string): void;
    /**
     * 收起文件夹
     * @param id - 文件夹 ID
     */
    collapse(id: string): void;
    /**
     * 设置展开的文件夹
     * @param ids - 展开的文件夹 ID 列表
     */
    setExpandedIds(ids: string[]): void;
    /**
     * 展开所有文件夹
     */
    expandAll(): void;
    /**
     * 收起所有文件夹
     */
    collapseAll(): void;
    /**
     * 添加书签
     * @param item - 书签项（不含 id 则自动生成）
     * @param parentId - 父文件夹 ID（可选）
     * @param index - 插入位置索引（可选）
     * @returns 添加的书签项
     */
    add(item: Omit<BookmarkLeafItem, 'id'> & {
        id?: string;
    }, parentId?: string, index?: number): BookmarkItem;
    /**
     * 添加文件夹
     * @param folder - 文件夹项（不含 id 则自动生成）
     * @param parentId - 父文件夹 ID（可选）
     * @param index - 插入位置索引（可选）
     * @returns 添加的文件夹项
     */
    addFolder(folder: Omit<BookmarkFolderItem, 'id' | 'children'> & {
        id?: string;
        children?: BookmarkItem[];
    }, parentId?: string, index?: number): BookmarkFolderItem;
    /**
     * 删除书签
     * @param id - 书签 ID
     * @returns 是否删除成功
     */
    remove(id: string): boolean;
    /**
     * 更新书签
     * @param id - 书签 ID
     * @param changes - 更新的字段
     * @returns 是否更新成功
     */
    update(id: string, changes: Partial<BookmarkItem>): boolean;
    /**
     * 移动书签
     * @param sourceId - 源书签 ID
     * @param targetId - 目标书签 ID
     * @param position - 放置位置
     * @returns 是否移动成功
     */
    move(sourceId: string, targetId: string, position: 'before' | 'after' | 'inside'): boolean;
    /**
     * 设置悬停的书签
     * @param id - 书签 ID（null 表示离开）
     */
    setActiveId(id: string | null): void;
    /**
     * 更新书签数据
     * @param items - 新的书签数据
     */
    updateItems(items: BookmarkItem[]): void;
    /**
     * 订阅事件
     * @param event - 事件名称
     * @param handler - 事件处理函数
     * @returns 取消订阅函数
     */
    on<K extends keyof BookmarkEventMap>(event: K, handler: (params: BookmarkEventMap[K]) => void): () => void;
    /**
     * 销毁管理器
     */
    destroy(): void;
    /**
     * 保存到本地存储
     */
    saveToStorage(): void;
    /**
     * 从本地存储加载
     */
    loadFromStorage(): void;
    /**
     * 清除本地存储
     */
    clearStorage(): void;
    /**
     * 插入书签项到指定位置
     */
    private insertItem;
    /**
     * 从列表中移除书签项
     */
    private removeItem;
    /**
     * 递归从列表中移除项
     */
    private removeFromList;
    /**
     * 获取所有文件夹 ID
     */
    private getAllFolderIds;
    /**
     * 触发变更事件
     */
    private emitChange;
}
