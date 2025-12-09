/**
 * 书签索引管理器
 * 使用 Map 提供 O(1) 的查找性能
 * @module utils/bookmark-index
 */
import type { BookmarkItem } from '../types';
/**
 * 书签索引类
 * 提供快速查找和缓存功能
 */
export declare class BookmarkIndex {
    /** ID 到书签项的映射 */
    private itemMap;
    /** ID 到父级 ID 的映射 */
    private parentMap;
    /** ID 到路径的映射 */
    private pathMap;
    /**
     * 构建索引
     * @param items - 书签列表
     */
    build(items: BookmarkItem[]): void;
    /**
     * 递归构建索引
     */
    private buildRecursive;
    /**
     * 根据 ID 查找书签项 - O(1) 时间复杂度
     * @param id - 书签 ID
     * @returns 书签项
     */
    get(id: string): BookmarkItem | undefined;
    /**
     * 获取父级 ID
     * @param id - 书签 ID
     * @returns 父级 ID
     */
    getParentId(id: string): string | undefined;
    /**
     * 获取所有父级 ID 列表
     * @param id - 书签 ID
     * @returns 父级 ID 列表
     */
    getParentIds(id: string): string[];
    /**
     * 获取路径
     * @param id - 书签 ID
     * @returns 路径 ID 数组
     */
    getPath(id: string): string[];
    /**
     * 检查是否存在
     * @param id - 书签 ID
     * @returns 是否存在
     */
    has(id: string): boolean;
    /**
     * 获取所有 ID
     * @returns ID 数组
     */
    getAllIds(): string[];
    /**
     * 获取索引大小
     * @returns 索引中的项数
     */
    get size(): number;
    /**
     * 清除索引
     */
    clear(): void;
    /**
     * 更新单个项
     * @param id - 书签 ID
     * @param item - 新的书签项
     */
    update(id: string, item: BookmarkItem): void;
    /**
     * 删除项
     * @param id - 书签 ID
     */
    delete(id: string): void;
}
