/**
 * 书签工具函数
 * @module utils/bookmark-utils
 * @description 提供书签数据处理的各种工具函数
 */

import type {
  BookmarkFolderItem,
  BookmarkItem,
  BookmarkItemPath,
  BookmarkItemWithId,
  BookmarkLeafItem,
  BookmarkSortOptions,
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

// ==================== 新增工具函数 ====================

/**
 * 深拷贝书签项
 * @description 创建书签项的完整副本，可选生成新 ID
 * @param item - 要拷贝的书签项
 * @param newId - 是否为副本生成新 ID，默认 false
 * @returns 拷贝后的书签项
 * @example
 * ```ts
 * const copy = cloneBookmark(bookmark, true)
 * ```
 */
export function cloneBookmark<T extends BookmarkItem>(item: T, newId = false): T {
  const cloned = JSON.parse(JSON.stringify(item)) as T

  if (newId) {
    // 为主项和所有子项生成新 ID
    const assignNewIds = (bookmarkItem: BookmarkItem) => {
      if ('id' in bookmarkItem && bookmarkItem.id) {
        (bookmarkItem as BookmarkItemWithId).id = generateId()
      }
      if (isFolder(bookmarkItem)) {
        bookmarkItem.children.forEach(assignNewIds)
      }
    }
    assignNewIds(cloned)
  }

  return cloned
}

/**
 * 合并书签列表
 * @description 将源书签列表合并到目标列表，跳过已存在的 ID
 * @param target - 目标书签列表
 * @param source - 源书签列表
 * @param options - 合并选项
 * @returns 合并后的书签列表
 */
export function mergeBookmarks(
  target: BookmarkItem[],
  source: BookmarkItem[],
  options: {
    /** 是否覆盖同 ID 的项 */
    overwrite?: boolean
    /** 是否深度合并文件夹 */
    deepMerge?: boolean
  } = {},
): BookmarkItem[] {
  const { overwrite = false, deepMerge = true } = options
  const result = cloneBookmark({ type: 'folder', id: 'temp', title: '', children: target } as BookmarkFolderItem).children
  const existingIds = new Set<string>()

  // 收集所有已存在的 ID
  const collectIds = (items: BookmarkItem[]) => {
    for (const item of items) {
      const id = getItemId(item)
      if (id) existingIds.add(id)
      if (isFolder(item)) collectIds(item.children)
    }
  }
  collectIds(result)

  // 合并源列表
  for (const sourceItem of source) {
    const sourceId = getItemId(sourceItem)

    if (sourceId && existingIds.has(sourceId)) {
      if (overwrite) {
        // 覆盖模式：查找并替换
        const replaceInList = (items: BookmarkItem[]): boolean => {
          for (let i = 0; i < items.length; i++) {
            if (getItemId(items[i]) === sourceId) {
              items[i] = cloneBookmark(sourceItem)
              return true
            }
            if (isFolder(items[i]) && replaceInList((items[i] as BookmarkFolderItem).children)) {
              return true
            }
          }
          return false
        }
        replaceInList(result)
      }
      else if (deepMerge && isFolder(sourceItem)) {
        // 深度合并文件夹
        const targetFolder = findItemById(result, sourceId) as BookmarkFolderItem | undefined
        if (targetFolder && isFolder(targetFolder)) {
          targetFolder.children = mergeBookmarks(targetFolder.children, sourceItem.children, options)
        }
      }
      // 否则跳过
    }
    else {
      // 添加新项
      result.push(cloneBookmark(sourceItem))
      if (sourceId) existingIds.add(sourceId)
    }
  }

  return result
}

/**
 * 校验书签项数据结构
 * @description 检查书签项是否符合规范
 * @param item - 要校验的书签项
 * @param strict - 是否严格模式（检查更多字段）
 * @returns 校验结果
 */
export function validateBookmark(item: unknown, strict = false): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (!item || typeof item !== 'object') {
    return { valid: false, errors: ['书签项必须是一个对象'] }
  }

  const obj = item as Record<string, unknown>

  // 检查类型
  const type = obj.type as string | undefined

  if (type === 'separator') {
    // 分隔线只需要 type
    return { valid: true, errors: [] }
  }

  // 检查 ID
  if (!obj.id || typeof obj.id !== 'string') {
    errors.push('缺少有效的 id 字段')
  }

  // 检查标题
  if (!obj.title || typeof obj.title !== 'string') {
    errors.push('缺少有效的 title 字段')
  }

  if (type === 'folder') {
    // 检查文件夹的 children
    if (!Array.isArray(obj.children)) {
      errors.push('文件夹必须包含 children 数组')
    }
    else {
      // 递归检查子项
      obj.children.forEach((child, index) => {
        const childResult = validateBookmark(child, strict)
        if (!childResult.valid) {
          errors.push(`children[${index}]: ${childResult.errors.join(', ')}`)
        }
      })
    }
  }
  else {
    // 检查普通书签的 URL
    if (!obj.url || typeof obj.url !== 'string') {
      errors.push('书签必须包含有效的 url 字段')
    }
    else if (strict) {
      // 严格模式下检查 URL 格式
      try {
        new URL(obj.url as string)
      }
      catch {
        errors.push('url 格式无效')
      }
    }
  }

  // 严格模式额外检查
  if (strict) {
    if (obj.createdAt !== undefined && typeof obj.createdAt !== 'number') {
      errors.push('createdAt 必须是数字')
    }
    if (obj.updatedAt !== undefined && typeof obj.updatedAt !== 'number') {
      errors.push('updatedAt 必须是数字')
    }
    if (obj.sortIndex !== undefined && typeof obj.sortIndex !== 'number') {
      errors.push('sortIndex 必须是数字')
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * 排序书签列表
 * @description 根据指定选项对书签列表进行排序
 * @param items - 要排序的书签列表
 * @param options - 排序选项
 * @param recursive - 是否递归排序子文件夹，默认 false
 * @returns 排序后的新数组（不修改原数组）
 */
export function sortBookmarks(
  items: BookmarkItem[],
  options: BookmarkSortOptions,
  recursive = false,
): BookmarkItem[] {
  const { field, direction = 'asc', foldersFirst = true, pinnedFirst = true } = options

  const compareItems = (a: BookmarkItem, b: BookmarkItem): number => {
    // 分隔线保持位置
    if (a.type === 'separator' || b.type === 'separator') {
      return 0
    }

    // 置顶优先
    if (pinnedFirst) {
      const aPinned = 'pinned' in a && a.pinned
      const bPinned = 'pinned' in b && b.pinned
      if (aPinned && !bPinned) return -1
      if (!aPinned && bPinned) return 1
    }

    // 文件夹优先
    if (foldersFirst) {
      const aFolder = isFolder(a)
      const bFolder = isFolder(b)
      if (aFolder && !bFolder) return -1
      if (!aFolder && bFolder) return 1
    }

    // 按字段排序
    let aValue: string | number | undefined
    let bValue: string | number | undefined

    switch (field) {
      case 'title':
        aValue = 'title' in a ? a.title : ''
        bValue = 'title' in b ? b.title : ''
        break
      case 'createdAt':
        aValue = 'createdAt' in a ? a.createdAt : 0
        bValue = 'createdAt' in b ? b.createdAt : 0
        break
      case 'updatedAt':
        aValue = 'updatedAt' in a ? a.updatedAt : 0
        bValue = 'updatedAt' in b ? b.updatedAt : 0
        break
      case 'visitCount':
        aValue = 'visitCount' in a ? (a as BookmarkLeafItem).visitCount : 0
        bValue = 'visitCount' in b ? (b as BookmarkLeafItem).visitCount : 0
        break
      case 'sortIndex':
        aValue = 'sortIndex' in a ? a.sortIndex : 0
        bValue = 'sortIndex' in b ? b.sortIndex : 0
        break
    }

    if (aValue === undefined) aValue = typeof bValue === 'string' ? '' : 0
    if (bValue === undefined) bValue = typeof aValue === 'string' ? '' : 0

    let result: number
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      result = aValue.localeCompare(bValue)
    }
    else {
      result = (aValue as number) - (bValue as number)
    }

    return direction === 'desc' ? -result : result
  }

  // 拷贝并排序
  const sorted = [...items].sort(compareItems)

  // 递归排序子文件夹
  if (recursive) {
    for (const item of sorted) {
      if (isFolder(item)) {
        item.children = sortBookmarks(item.children, options, true)
      }
    }
  }

  return sorted
}

/**
 * 获取书签数量统计
 * @param items - 书签列表
 * @returns 统计信息
 */
export function countBookmarks(items: BookmarkItem[]): {
  total: number
  bookmarks: number
  folders: number
  separators: number
  maxDepth: number
} {
  let bookmarks = 0
  let folders = 0
  let separators = 0
  let maxDepth = 0

  const count = (list: BookmarkItem[], depth: number) => {
    if (depth > maxDepth) maxDepth = depth

    for (const item of list) {
      if (item.type === 'separator') {
        separators++
      }
      else if (isFolder(item)) {
        folders++
        count(item.children, depth + 1)
      }
      else {
        bookmarks++
      }
    }
  }

  count(items, 0)

  return {
    total: bookmarks + folders + separators,
    bookmarks,
    folders,
    separators,
    maxDepth,
  }
}

/**
 * 过滤书签列表
 * @param items - 书签列表
 * @param predicate - 过滤函数
 * @param includeParents - 如果子项匹配，是否保留父文件夹
 * @returns 过滤后的书签列表
 */
export function filterBookmarks(
  items: BookmarkItem[],
  predicate: (item: BookmarkItem) => boolean,
  includeParents = true,
): BookmarkItem[] {
  const result: BookmarkItem[] = []

  for (const item of items) {
    if (isFolder(item)) {
      const filteredChildren = filterBookmarks(item.children, predicate, includeParents)
      if (filteredChildren.length > 0 || predicate(item)) {
        result.push({
          ...item,
          children: filteredChildren,
        })
      }
    }
    else if (predicate(item)) {
      result.push(item)
    }
  }

  return result
}

