/**
 * 书签管理器
 * @module managers/bookmark-manager
 * @description 提供书签数据的核心管理功能，包括 CRUD 操作、状态管理、事件处理等
 */

import type {
  BookmarkConfig,
  BookmarkEventMap,
  BookmarkFolderItem,
  BookmarkItem,
  BookmarkItemWithId,
  BookmarkLeafItem,
  BookmarkSortOptions,
  BookmarkState,
} from '../types'
import { DEFAULT_BOOKMARK_CONFIG, DEFAULT_BOOKMARK_STATE } from '../types'
import { EventEmitter, findItemById, generateId, getItemPath, getParentIds, isFolder } from '../utils'
import { BookmarkIndex } from '../utils/bookmark-index'

// ==================== 类型定义 ====================

/**
 * 书签管理器配置
 * @interface
 * @extends BookmarkConfig
 */
export interface BookmarkManagerConfig extends BookmarkConfig {
  /**
   * 初始选中的书签 ID
   */
  defaultSelectedId?: string

  /**
   * 初始展开的文件夹 ID 列表
   */
  defaultExpandedIds?: string[]

  /**
   * 是否启用操作历史记录（用于撤销/重做）
   * @default false
   */
  enableHistory?: boolean

  /**
   * 最大历史记录数
   * @default 50
   */
  maxHistorySize?: number
}

/**
 * 导入导出的数据格式
 * @interface
 */
export interface BookmarkExportData {
  /** 版本号 */
  version: string
  /** 导出时间 */
  exportedAt: number
  /** 书签数据 */
  items: BookmarkItem[]
  /** 元数据 */
  meta?: Record<string, unknown>
}

/**
 * 批量操作结果
 * @interface
 */
export interface BatchOperationResult<T = unknown> {
  /** 成功的项 */
  success: T[]
  /** 失败的项 */
  failed: Array<{ item: T, error: string }>
  /** 总数 */
  total: number
}

/**
 * 书签管理器
 * 提供书签的核心状态管理和事件处理功能
 */
export class BookmarkManager {
  /** 配置 */
  private config: Required<Omit<BookmarkConfig, 'items'>> & { items: BookmarkItem[] }

  /** 书签数据 */
  private items: BookmarkItem[]

  /** 当前状态 */
  private state: BookmarkState

  /** 事件发射器 */
  private emitter = new EventEmitter<BookmarkEventMap>()

  /** 书签索引（用于快速查找） */
  private index = new BookmarkIndex()

  /**
   * 创建书签管理器
   * @param config - 书签配置
   */
  constructor(config: BookmarkManagerConfig = { items: [] }) {
    const { items, defaultSelectedId, defaultExpandedIds, ...rest } = config

    // 合并默认配置
    this.config = {
      ...DEFAULT_BOOKMARK_CONFIG,
      ...rest,
      items: [],
    }

    this.items = items || []

    // 构建索引
    this.index.build(this.items)

    // 初始化状态
    this.state = {
      ...DEFAULT_BOOKMARK_STATE,
      selectedId: defaultSelectedId,
      expandedIds: defaultExpandedIds || [],
    }

    // 如果启用持久化，尝试从存储恢复
    if (this.config.persistent) {
      this.loadFromStorage()
    }
  }

  /**
   * 获取当前配置
   */
  getConfig(): Required<Omit<BookmarkConfig, 'items'>> & { items: BookmarkItem[] } {
    return { ...this.config }
  }

  /**
   * 获取书签列表
   */
  getItems(): BookmarkItem[] {
    return this.items
  }

  /**
   * 获取当前状态
   */
  getState(): BookmarkState {
    return { ...this.state }
  }

  /**
   * 获取选中的书签 ID
   */
  getSelectedId(): string | undefined {
    return this.state.selectedId
  }

  /**
   * 获取展开的文件夹 ID 列表
   */
  getExpandedIds(): string[] {
    return [...this.state.expandedIds]
  }

  /**
   * 选中书签
   * @param id - 书签 ID
   * @param event - 原始事件
   */
  select(id: string, event?: Event): void {
    // 使用索引快速查找（O(1) 而不是 O(n)）
    const item = this.index.get(id)

    if (!item) {
      return
    }

    // 分隔线不可选中
    if (item.type === 'separator') {
      return
    }

    // 如果是文件夹，切换展开状态
    if (isFolder(item)) {
      this.toggleExpand(id)
      return
    }

    // 更新状态
    const path = getItemPath(this.items, id)
    this.state.selectedId = id

    // 触发事件
    this.emitter.emit('select', {
      id,
      item,
      path: path || { ids: [id], items: [item] },
      event,
    })
  }

  /**
   * 切换文件夹展开状态
   * @param id - 文件夹 ID
   */
  toggleExpand(id: string): void {
    const isExpanded = this.state.expandedIds.includes(id)
    if (isExpanded) {
      this.collapse(id)
    }
    else {
      this.expand(id)
    }
  }

  /**
   * 展开文件夹
   * @param id - 文件夹 ID
   */
  expand(id: string): void {
    if (this.state.expandedIds.includes(id)) {
      return
    }

    this.state.expandedIds.push(id)

    this.emitter.emit('expand', {
      id,
      expanded: true,
      expandedIds: [...this.state.expandedIds],
    })
  }

  /**
   * 收起文件夹
   * @param id - 文件夹 ID
   */
  collapse(id: string): void {
    if (!this.state.expandedIds.includes(id)) {
      return
    }

    this.state.expandedIds = this.state.expandedIds.filter(i => i !== id)

    this.emitter.emit('expand', {
      id,
      expanded: false,
      expandedIds: [...this.state.expandedIds],
    })
  }

  /**
   * 设置展开的文件夹
   * @param ids - 展开的文件夹 ID 列表
   */
  setExpandedIds(ids: string[]): void {
    this.state.expandedIds = [...ids]
  }

  /**
   * 展开所有文件夹
   */
  expandAll(): void {
    const allFolderIds = this.getAllFolderIds()
    this.state.expandedIds = allFolderIds
  }

  /**
   * 收起所有文件夹
   */
  collapseAll(): void {
    this.state.expandedIds = []
  }

  /**
   * 添加书签
   * @param item - 书签项（不含 id 则自动生成）
   * @param parentId - 父文件夹 ID（可选）
   * @param index - 插入位置索引（可选）
   * @returns 添加的书签项
   */
  add(
    item: Omit<BookmarkLeafItem, 'id'> & { id?: string },
    parentId?: string,
    index?: number,
  ): BookmarkItem {
    const newItem: BookmarkLeafItem = {
      ...item,
      id: item.id || generateId(),
      type: 'bookmark',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }

    this.insertItem(newItem, parentId, index)

    this.emitter.emit('add', { item: newItem, parentId, index })
    this.emitChange()

    return newItem
  }

  /**
   * 添加文件夹
   * @param folder - 文件夹项（不含 id 则自动生成）
   * @param parentId - 父文件夹 ID（可选）
   * @param index - 插入位置索引（可选）
   * @returns 添加的文件夹项
   */
  addFolder(
    folder: Omit<BookmarkFolderItem, 'id' | 'children'> & { id?: string, children?: BookmarkItem[] },
    parentId?: string,
    index?: number,
  ): BookmarkFolderItem {
    const newFolder: BookmarkFolderItem = {
      ...folder,
      id: folder.id || generateId(),
      type: 'folder',
      children: folder.children || [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }

    this.insertItem(newFolder, parentId, index)

    this.emitter.emit('add', { item: newFolder, parentId, index })
    this.emitChange()

    return newFolder
  }

  /**
   * 删除书签
   * @param id - 书签 ID
   * @returns 是否删除成功
   */
  remove(id: string): boolean {
    const item = this.index.get(id)
    if (!item) {
      return false
    }

    const removed = this.removeItem(id)
    if (removed) {
      // 从索引中删除
      this.index.delete(id)

      // 如果删除的是选中项，清除选中状态
      if (this.state.selectedId === id) {
        this.state.selectedId = undefined
      }

      // 如果删除的是文件夹，从展开列表中移除
      this.state.expandedIds = this.state.expandedIds.filter(i => i !== id)

      this.emitter.emit('remove', { id, item })
      this.emitChange()
    }

    return removed
  }

  /**
   * 更新书签
   * @param id - 书签 ID
   * @param changes - 更新的字段
   * @returns 是否更新成功
   */
  update(id: string, changes: Partial<BookmarkItem>): boolean {
    const item = this.index.get(id)
    if (!item) {
      return false
    }

    // 合并更新
    Object.assign(item, changes, { updatedAt: Date.now() })

    // 更新索引
    this.index.update(id, item)

    this.emitter.emit('update', { id, item, changes })
    this.emitChange()

    return true
  }

  /**
   * 移动书签
   * @param sourceId - 源书签 ID
   * @param targetId - 目标书签 ID
   * @param position - 放置位置
   * @returns 是否移动成功
   */
  move(sourceId: string, targetId: string, position: 'before' | 'after' | 'inside'): boolean {
    if (sourceId === targetId) {
      return false
    }

    const sourceItem = this.index.get(sourceId)
    const targetItem = this.index.get(targetId)

    if (!sourceItem || !targetItem) {
      return false
    }

    // 如果目标位置是 inside，目标必须是文件夹
    if (position === 'inside' && !isFolder(targetItem)) {
      return false
    }

    // 先删除源项
    this.removeItem(sourceId)

    // 根据位置插入
    if (position === 'inside') {
      (targetItem as BookmarkFolderItem).children.push(sourceItem)
    }
    else {
      const targetParentIds = getParentIds(this.items, targetId)
      const targetParentId = targetParentIds[targetParentIds.length - 1]
      const targetList = targetParentId
        ? (findItemById(this.items, targetParentId) as BookmarkFolderItem).children
        : this.items

      const targetIndex = targetList.findIndex(item => ('id' in item && item.id === targetId))
      const insertIndex = position === 'after' ? targetIndex + 1 : targetIndex

      targetList.splice(insertIndex, 0, sourceItem)
    }

    // 重建索引
    this.index.build(this.items)

    this.emitter.emit('reorder', { sourceId, targetId, position })
    this.emitChange()

    return true
  }

  /**
   * 设置悬停的书签
   * @param id - 书签 ID（null 表示离开）
   */
  setActiveId(id: string | null): void {
    const prevId = this.state.activeId
    if (prevId === id) {
      return
    }

    this.state.activeId = id ?? undefined

    const item = id ? this.index.get(id) ?? null : null
    this.emitter.emit('hover', { id, item })
  }

  /**
   * 更新书签数据
   * @param items - 新的书签数据
   */
  updateItems(items: BookmarkItem[]): void {
    this.items = items
    // 重建索引
    this.index.build(this.items)
    this.emitChange()
  }

  /**
   * 订阅事件
   * @param event - 事件名称
   * @param handler - 事件处理函数
   * @returns 取消订阅函数
   */
  on<K extends keyof BookmarkEventMap>(
    event: K,
    handler: (params: BookmarkEventMap[K]) => void,
  ): () => void {
    return this.emitter.on(event, handler)
  }

  /**
   * 销毁管理器
   */
  destroy(): void {
    this.emitter.clear()
    this.index.clear()
  }

  // ==================== 存储方法 ====================

  /**
   * 保存到本地存储
   */
  saveToStorage(): void {
    if (typeof localStorage === 'undefined') {
      return
    }

    try {
      localStorage.setItem(this.config.storageKey, JSON.stringify(this.items))
      this.emitter.emit('sync', { items: this.items })
    }
    catch (error) {
      console.error('[BookmarkManager] Failed to save to storage:', error)
    }
  }

  /**
   * 从本地存储加载
   */
  loadFromStorage(): void {
    if (typeof localStorage === 'undefined') {
      return
    }

    try {
      const data = localStorage.getItem(this.config.storageKey)
      if (data) {
        this.items = JSON.parse(data)
        // 重建索引
        this.index.build(this.items)
      }
    }
    catch (error) {
      console.error('[BookmarkManager] Failed to load from storage:', error)
    }
  }

  /**
   * 清除本地存储
   */
  clearStorage(): void {
    if (typeof localStorage === 'undefined') {
      return
    }

    try {
      localStorage.removeItem(this.config.storageKey)
    }
    catch (error) {
      console.error('[BookmarkManager] Failed to clear storage:', error)
    }
  }

  // ==================== 查询方法 ====================

  /**
   * 根据 ID 获取书签项
   * @param id - 书签 ID
   * @returns 书签项，不存在返回 undefined
   */
  getById(id: string): BookmarkItem | undefined {
    return this.index.get(id)
  }

  /**
   * 根据 URL 查找书签
   * @param url - 要查找的 URL
   * @param exact - 是否精确匹配，默认 true
   * @returns 匹配的书签列表
   */
  findByUrl(url: string, exact = true): BookmarkLeafItem[] {
    const results: BookmarkLeafItem[] = []
    const normalizedUrl = url.toLowerCase().replace(/\/+$/, '')

    const search = (items: BookmarkItem[]) => {
      for (const item of items) {
        if (!isFolder(item) && item.type !== 'separator' && 'url' in item) {
          const itemUrl = item.url.toLowerCase().replace(/\/+$/, '')
          if (exact ? itemUrl === normalizedUrl : itemUrl.includes(normalizedUrl)) {
            results.push(item as BookmarkLeafItem)
          }
        }
        if (isFolder(item)) {
          search(item.children)
        }
      }
    }

    search(this.items)
    return results
  }

  /**
   * 根据标题查找书签
   * @param title - 要查找的标题（支持模糊匹配）
   * @param caseSensitive - 是否区分大小写，默认 false
   * @returns 匹配的书签列表
   */
  findByTitle(title: string, caseSensitive = false): BookmarkItemWithId[] {
    const results: BookmarkItemWithId[] = []
    const searchTitle = caseSensitive ? title : title.toLowerCase()

    const search = (items: BookmarkItem[]) => {
      for (const item of items) {
        if (item.type === 'separator') continue

        const itemTitle = 'title' in item
          ? (caseSensitive ? item.title : item.title.toLowerCase())
          : ''

        if (itemTitle.includes(searchTitle)) {
          results.push(item as BookmarkItemWithId)
        }

        if (isFolder(item)) {
          search(item.children)
        }
      }
    }

    search(this.items)
    return results
  }

  /**
   * 根据标签查找书签
   * @param tags - 要查找的标签数组
   * @param matchAll - 是否需要匹配所有标签，默认 false（匹配任一即可）
   * @returns 匹配的书签列表
   */
  findByTags(tags: string[], matchAll = false): BookmarkLeafItem[] {
    const results: BookmarkLeafItem[] = []
    const lowerTags = tags.map(t => t.toLowerCase())

    const search = (items: BookmarkItem[]) => {
      for (const item of items) {
        if (!isFolder(item) && item.type !== 'separator' && 'tags' in item && item.tags) {
          const itemTags = item.tags.map(t => t.toLowerCase())
          const matches = matchAll
            ? lowerTags.every(tag => itemTags.includes(tag))
            : lowerTags.some(tag => itemTags.includes(tag))

          if (matches) {
            results.push(item as BookmarkLeafItem)
          }
        }
        if (isFolder(item)) {
          search(item.children)
        }
      }
    }

    search(this.items)
    return results
  }

  /**
   * 获取文件夹的子项
   * @param folderId - 文件夹 ID，不传则返回根级项
   * @returns 子项列表
   */
  getChildren(folderId?: string): BookmarkItem[] {
    if (!folderId) {
      return [...this.items]
    }

    const folder = this.index.get(folderId)
    if (folder && isFolder(folder)) {
      return [...folder.children]
    }

    return []
  }

  /**
   * 获取所有标签
   * @returns 标签列表（去重）
   */
  getAllTags(): string[] {
    const tags = new Set<string>()

    const collect = (items: BookmarkItem[]) => {
      for (const item of items) {
        if (!isFolder(item) && item.type !== 'separator' && 'tags' in item && item.tags) {
          item.tags.forEach(tag => tags.add(tag))
        }
        if (isFolder(item)) {
          collect(item.children)
        }
      }
    }

    collect(this.items)
    return Array.from(tags).sort()
  }

  /**
   * 统计书签数量
   * @returns 统计信息
   */
  getStats(): { total: number, bookmarks: number, folders: number, separators: number } {
    let bookmarks = 0
    let folders = 0
    let separators = 0

    const count = (items: BookmarkItem[]) => {
      for (const item of items) {
        if (item.type === 'separator') {
          separators++
        }
        else if (isFolder(item)) {
          folders++
          count(item.children)
        }
        else {
          bookmarks++
        }
      }
    }

    count(this.items)

    return {
      total: bookmarks + folders + separators,
      bookmarks,
      folders,
      separators,
    }
  }

  // ==================== 批量操作 ====================

  /**
   * 批量添加书签
   * @param items - 要添加的书签列表
   * @param parentId - 父文件夹 ID
   * @returns 批量操作结果
   */
  addBatch(
    items: Array<Omit<BookmarkLeafItem, 'id'> & { id?: string }>,
    parentId?: string,
  ): BatchOperationResult<BookmarkItem> {
    const result: BatchOperationResult<BookmarkItem> = {
      success: [],
      failed: [],
      total: items.length,
    }

    for (const item of items) {
      try {
        const added = this.add(item, parentId)
        result.success.push(added)
      }
      catch (error) {
        result.failed.push({
          item: item as BookmarkItem,
          error: error instanceof Error ? error.message : '添加失败',
        })
      }
    }

    return result
  }

  /**
   * 批量删除书签
   * @param ids - 要删除的书签 ID 列表
   * @returns 批量操作结果
   */
  removeBatch(ids: string[]): BatchOperationResult<string> {
    const result: BatchOperationResult<string> = {
      success: [],
      failed: [],
      total: ids.length,
    }

    for (const id of ids) {
      if (this.remove(id)) {
        result.success.push(id)
      }
      else {
        result.failed.push({
          item: id,
          error: '书签不存在或删除失败',
        })
      }
    }

    return result
  }

  /**
   * 批量更新书签
   * @param updates - 要更新的书签 ID 和内容
   * @returns 批量操作结果
   */
  updateBatch(
    updates: Array<{ id: string, changes: Partial<BookmarkItem> }>,
  ): BatchOperationResult<string> {
    const result: BatchOperationResult<string> = {
      success: [],
      failed: [],
      total: updates.length,
    }

    for (const { id, changes } of updates) {
      if (this.update(id, changes)) {
        result.success.push(id)
      }
      else {
        result.failed.push({
          item: id,
          error: '书签不存在或更新失败',
        })
      }
    }

    return result
  }

  // ==================== 导入导出 ====================

  /**
   * 导出书签数据
   * @param meta - 额外的元数据
   * @returns 导出的数据对象
   */
  exportToJSON(meta?: Record<string, unknown>): BookmarkExportData {
    return {
      version: '1.0.0',
      exportedAt: Date.now(),
      items: JSON.parse(JSON.stringify(this.items)),
      meta,
    }
  }

  /**
   * 从 JSON 导入书签
   * @param data - 导入的数据
   * @param merge - 是否合并而不是替换，默认 false
   * @returns 是否导入成功
   */
  importFromJSON(data: BookmarkExportData, merge = false): boolean {
    try {
      // 验证数据格式
      if (!data.items || !Array.isArray(data.items)) {
        console.error('[BookmarkManager] Invalid import data: items must be an array')
        return false
      }

      if (merge) {
        // 合并模式：添加不存在的书签
        for (const item of data.items) {
          const id = 'id' in item ? item.id : undefined
          if (id && !this.index.has(id)) {
            this.items.push(item)
          }
        }
      }
      else {
        // 替换模式
        this.items = data.items
      }

      // 重建索引
      this.index.build(this.items)
      this.emitChange()

      return true
    }
    catch (error) {
      console.error('[BookmarkManager] Failed to import data:', error)
      return false
    }
  }

  /**
   * 导出为字符串
   * @param pretty - 是否格式化输出，默认 true
   * @returns JSON 字符串
   */
  exportToString(pretty = true): string {
    const data = this.exportToJSON()
    return pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data)
  }

  /**
   * 从字符串导入
   * @param jsonString - JSON 字符串
   * @param merge - 是否合并
   * @returns 是否导入成功
   */
  importFromString(jsonString: string, merge = false): boolean {
    try {
      const data = JSON.parse(jsonString) as BookmarkExportData
      return this.importFromJSON(data, merge)
    }
    catch (error) {
      console.error('[BookmarkManager] Failed to parse import string:', error)
      return false
    }
  }

  // ==================== 工具方法 ====================

  /**
   * 检查移动是否会造成循环依赖
   * @param sourceId - 源书签 ID
   * @param targetId - 目标书签 ID
   * @returns 是否会造成循环
   */
  wouldCreateCycle(sourceId: string, targetId: string): boolean {
    // 如果源是文件夹，检查目标是否是源的子孙
    const sourceItem = this.index.get(sourceId)
    if (!sourceItem || !isFolder(sourceItem)) {
      return false
    }

    // 获取目标的所有祖先
    const targetAncestors = this.index.getParentIds(targetId)

    // 如果源是目标的祖先，则会造成循环
    return targetAncestors.includes(sourceId)
  }

  /**
   * 排序书签
   * @param options - 排序选项
   * @param parentId - 要排序的文件夹 ID，不传则排序根级
   */
  sort(options: BookmarkSortOptions, parentId?: string): void {
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
          aValue = 'visitCount' in a ? a.visitCount : 0
          bValue = 'visitCount' in b ? b.visitCount : 0
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

    // 获取要排序的列表
    let targetList: BookmarkItem[]
    if (parentId) {
      const folder = this.index.get(parentId)
      if (!folder || !isFolder(folder)) return
      targetList = folder.children
    }
    else {
      targetList = this.items
    }

    // 执行排序
    targetList.sort(compareItems)

    // 重建索引并触发变更
    this.index.build(this.items)
    this.emitChange()
  }

  /**
   * 插入书签项到指定位置
   */
  private insertItem(item: BookmarkItem, parentId?: string, index?: number): void {
    let targetList = this.items

    if (parentId) {
      const parent = findItemById(this.items, parentId)
      if (parent && isFolder(parent)) {
        targetList = parent.children
      }
    }

    if (index !== undefined && index >= 0 && index <= targetList.length) {
      targetList.splice(index, 0, item)
    }
    else {
      targetList.push(item)
    }
  }

  /**
   * 从列表中移除书签项
   */
  private removeItem(id: string): boolean {
    return this.removeFromList(this.items, id)
  }

  /**
   * 递归从列表中移除项
   */
  private removeFromList(list: BookmarkItem[], id: string): boolean {
    const index = list.findIndex(item => ('id' in item && item.id === id))
    if (index !== -1) {
      list.splice(index, 1)
      return true
    }

    for (const item of list) {
      if (isFolder(item) && this.removeFromList(item.children, id)) {
        return true
      }
    }

    return false
  }

  /**
   * 获取所有文件夹 ID
   */
  private getAllFolderIds(): string[] {
    const ids: string[] = []

    const walk = (items: BookmarkItem[]) => {
      for (const item of items) {
        if (isFolder(item)) {
          ids.push(item.id)
          walk(item.children)
        }
      }
    }

    walk(this.items)
    return ids
  }

  /**
   * 触发变更事件
   */
  private emitChange(): void {
    this.emitter.emit('change', { items: this.items })

    // 自动同步到存储
    if (this.config.autoSync && this.config.persistent) {
      this.saveToStorage()
    }
  }
}

