/**
 * 书签管理器
 * 核心状态管理和事件处理
 * @module managers/bookmark-manager
 */

import type {
  BookmarkConfig,
  BookmarkEventMap,
  BookmarkFolderItem,
  BookmarkItem,
  BookmarkLeafItem,
  BookmarkState,
} from '../types'
import { DEFAULT_BOOKMARK_CONFIG, DEFAULT_BOOKMARK_STATE } from '../types'
import { EventEmitter, findItemById, generateId, getItemPath, getParentIds, isFolder } from '../utils'
import { BookmarkIndex } from '../utils/bookmark-index'

/**
 * 书签管理器配置
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

