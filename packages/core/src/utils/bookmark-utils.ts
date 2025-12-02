/**
 * 书签工具函数
 * @module utils/bookmark-utils
 */

import type {
  BookmarkFolderItem,
  BookmarkItem,
  BookmarkItemPath,
  FlatBookmarkItem,
} from '../types'

/**
 * 生成唯一 ID
 * @returns 唯一 ID 字符串
 */
export function generateId(): string {
  return `bm_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

/**
 * 检查是否为书签文件夹
 * @param item - 书签项
 * @returns 是否为文件夹
 */
export function isFolder(item: BookmarkItem): item is BookmarkFolderItem {
  return item.type === 'folder'
}

/**
 * 检查是否为分隔线
 * @param item - 书签项
 * @returns 是否为分隔线
 */
export function isSeparator(item: BookmarkItem): boolean {
  return item.type === 'separator'
}

/**
 * 检查是否为普通书签
 * @param item - 书签项
 * @returns 是否为普通书签
 */
export function isBookmark(item: BookmarkItem): boolean {
  return !item.type || item.type === 'bookmark'
}

/**
 * 检查书签是否隐藏
 * @param item - 书签项
 * @returns 是否隐藏
 */
export function isHidden(item: BookmarkItem): boolean {
  if ('hidden' in item) {
    return item.hidden === true
  }
  return false
}

/**
 * 检查书签是否置顶
 * @param item - 书签项
 * @returns 是否置顶
 */
export function isPinned(item: BookmarkItem): boolean {
  if ('pinned' in item) {
    return item.pinned === true
  }
  return false
}

/**
 * 获取书签项的 ID
 * @param item - 书签项
 * @returns 书签 ID
 */
export function getItemId(item: BookmarkItem): string | undefined {
  return 'id' in item ? item.id : undefined
}

/**
 * 根据 ID 查找书签项
 * @param items - 书签列表
 * @param id - 书签 ID
 * @returns 找到的书签项
 */
export function findItemById(items: BookmarkItem[], id: string): BookmarkItem | undefined {
  for (const item of items) {
    if (getItemId(item) === id) {
      return item
    }

    if (isFolder(item) && item.children) {
      const found = findItemById(item.children, id)
      if (found) {
        return found
      }
    }
  }
  return undefined
}

/**
 * 获取书签项的路径
 * @param items - 书签列表
 * @param id - 书签 ID
 * @returns 书签路径信息
 */
export function getItemPath(items: BookmarkItem[], id: string): BookmarkItemPath | undefined {
  const path: BookmarkItem[] = []
  const ids: string[] = []

  function search(list: BookmarkItem[]): boolean {
    for (const item of list) {
      const itemId = getItemId(item)

      if (itemId === id) {
        path.push(item)
        ids.push(itemId)
        return true
      }

      if (isFolder(item) && item.children) {
        path.push(item)
        if (itemId) ids.push(itemId)

        if (search(item.children)) {
          return true
        }

        path.pop()
        if (itemId) ids.pop()
      }
    }
    return false
  }

  if (search(items)) {
    return { ids, items: path }
  }
  return undefined
}

/**
 * 获取书签项的父级 ID 列表
 * @param items - 书签列表
 * @param id - 书签 ID
 * @returns 父级 ID 列表
 */
export function getParentIds(items: BookmarkItem[], id: string): string[] {
  const path = getItemPath(items, id)
  if (!path) return []

  // 移除最后一个（自身）
  return path.ids.slice(0, -1)
}

/**
 * 扁平化书签列表
 * @param items - 书签列表
 * @param level - 当前层级
 * @param parentId - 父级 ID
 * @param path - 当前路径
 * @returns 扁平化的书签列表
 */
export function flattenItems(
  items: BookmarkItem[],
  level = 0,
  parentId?: string,
  path: string[] = [],
): FlatBookmarkItem[] {
  const result: FlatBookmarkItem[] = []

  for (const item of items) {
    const itemId = getItemId(item)
    const currentPath = itemId ? [...path, itemId] : path

    result.push({
      item,
      level,
      parentId,
      path: currentPath,
    })

    if (isFolder(item) && item.children) {
      result.push(...flattenItems(item.children, level + 1, itemId, currentPath))
    }
  }

  return result
}

