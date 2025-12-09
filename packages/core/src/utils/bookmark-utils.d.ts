/**
 * 书签工具函数
 * @module utils/bookmark-utils
 */
import type { BookmarkFolderItem, BookmarkItem, BookmarkItemPath, FlatBookmarkItem } from '../types';
/**
 * 生成唯一 ID
 * @returns 唯一 ID 字符串
 */
export declare function generateId(): string;
/**
 * 检查是否为书签文件夹
 * @param item - 书签项
 * @returns 是否为文件夹
 */
export declare function isFolder(item: BookmarkItem): item is BookmarkFolderItem;
/**
 * 检查是否为分隔线
 * @param item - 书签项
 * @returns 是否为分隔线
 */
export declare function isSeparator(item: BookmarkItem): boolean;
/**
 * 检查是否为普通书签
 * @param item - 书签项
 * @returns 是否为普通书签
 */
export declare function isBookmark(item: BookmarkItem): boolean;
/**
 * 检查书签是否隐藏
 * @param item - 书签项
 * @returns 是否隐藏
 */
export declare function isHidden(item: BookmarkItem): boolean;
/**
 * 检查书签是否置顶
 * @param item - 书签项
 * @returns 是否置顶
 */
export declare function isPinned(item: BookmarkItem): boolean;
/**
 * 获取书签项的 ID
 * @param item - 书签项
 * @returns 书签 ID
 */
export declare function getItemId(item: BookmarkItem): string | undefined;
/**
 * 根据 ID 查找书签项
 * @param items - 书签列表
 * @param id - 书签 ID
 * @returns 找到的书签项
 */
export declare function findItemById(items: BookmarkItem[], id: string): BookmarkItem | undefined;
/**
 * 获取书签项的路径
 * @param items - 书签列表
 * @param id - 书签 ID
 * @returns 书签路径信息
 */
export declare function getItemPath(items: BookmarkItem[], id: string): BookmarkItemPath | undefined;
/**
 * 获取书签项的父级 ID 列表
 * @param items - 书签列表
 * @param id - 书签 ID
 * @returns 父级 ID 列表
 */
export declare function getParentIds(items: BookmarkItem[], id: string): string[];
/**
 * 扁平化书签列表
 * @param items - 书签列表
 * @param level - 当前层级
 * @param parentId - 父级 ID
 * @param path - 当前路径
 * @returns 扁平化的书签列表
 */
export declare function flattenItems(items: BookmarkItem[], level?: number, parentId?: string, path?: string[]): FlatBookmarkItem[];
