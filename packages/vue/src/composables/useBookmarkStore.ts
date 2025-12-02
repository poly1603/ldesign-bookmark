/**
 * 书签状态管理
 * @module composables/useBookmarkStore
 */

import type { BookmarkConfig, BookmarkEventMap, BookmarkItem, BookmarkState } from '@ldesign/bookmark-core'
import { BookmarkManager } from '@ldesign/bookmark-core'
import type { Ref } from 'vue'
import { onUnmounted, reactive, ref, toRefs, watch } from 'vue'

/**
 * 书签状态存储配置
 */
export interface UseBookmarkStoreOptions extends Partial<BookmarkConfig> {
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
 * 书签状态存储返回值
 */
export interface UseBookmarkStoreReturn {
  /**
   * 书签列表
   */
  items: Ref<BookmarkItem[]>

  /**
   * 当前状态
   */
  state: BookmarkState

  /**
   * 选中的书签 ID
   */
  selectedId: Ref<string | undefined>

  /**
   * 展开的文件夹 ID 列表
   */
  expandedIds: Ref<string[]>

  /**
   * 激活的书签 ID
   */
  activeId: Ref<string | undefined>

  /**
   * 是否正在拖拽
   */
  isDragging: Ref<boolean>

  /**
   * 选中书签
   */
  select: (id: string, event?: Event) => void

  /**
   * 添加书签
   */
  add: (
    item: Omit<BookmarkItem, 'id'> & { id?: string },
    parentId?: string,
    index?: number
  ) => BookmarkItem

  /**
   * 删除书签
   */
  remove: (id: string) => boolean

  /**
   * 更新书签
   */
  update: (id: string, changes: Partial<BookmarkItem>) => boolean

  /**
   * 移动书签
   */
  move: (sourceId: string, targetId: string, position: 'before' | 'after' | 'inside') => boolean

  /**
   * 切换文件夹展开状态
   */
  toggleExpand: (id: string) => void

  /**
   * 展开文件夹
   */
  expand: (id: string) => void

  /**
   * 收起文件夹
   */
  collapse: (id: string) => void

  /**
   * 展开所有文件夹
   */
  expandAll: () => void

  /**
   * 收起所有文件夹
   */
  collapseAll: () => void

  /**
   * 设置激活的书签
   */
  setActiveId: (id: string | null) => void

  /**
   * 订阅事件
   */
  on: <K extends keyof BookmarkEventMap>(
    event: K,
    handler: (params: BookmarkEventMap[K]) => void
  ) => () => void

  /**
   * 保存到存储
   */
  save: () => void

  /**
   * 从存储加载
   */
  load: () => void

  /**
   * 更新书签列表
   */
  updateItems: (items: BookmarkItem[]) => void

  /**
   * 书签管理器实例
   */
  manager: BookmarkManager
}

/**
 * 书签状态存储
 * 提供响应式的书签状态管理
 * @param options - 配置选项
 * @returns 书签状态存储
 */
export function useBookmarkStore(options: UseBookmarkStoreOptions = {}): UseBookmarkStoreReturn {
  const { items: initialItems = [], defaultSelectedId, defaultExpandedIds, ...config } = options

  // 创建管理器
  const manager = new BookmarkManager({
    items: initialItems,
    defaultSelectedId,
    defaultExpandedIds,
    ...config,
  })

  // 响应式书签列表
  const items = ref<BookmarkItem[]>(manager.getItems())

  // 响应式状态
  const state = reactive<BookmarkState>({ ...manager.getState() })

  // 单独的响应式引用
  const selectedId = ref<string | undefined>(state.selectedId)
  const expandedIds = ref<string[]>(state.expandedIds)
  const activeId = ref<string | undefined>(state.activeId)
  const isDragging = ref(state.isDragging)

  // 取消订阅列表
  const unsubscribes: (() => void)[] = []

  // 监听变更事件，同步状态
  unsubscribes.push(
    manager.on('change', (params) => {
      items.value = params.items
    }),
  )

  unsubscribes.push(
    manager.on('select', (params) => {
      selectedId.value = params.id
      state.selectedId = params.id
    }),
  )

  unsubscribes.push(
    manager.on('expand', (params) => {
      expandedIds.value = params.expandedIds
      state.expandedIds = params.expandedIds
    }),
  )

  unsubscribes.push(
    manager.on('hover', (params) => {
      activeId.value = params.id ?? undefined
      state.activeId = params.id ?? undefined
    }),
  )

  // 清理
  onUnmounted(() => {
    unsubscribes.forEach(unsub => unsub())
    manager.destroy()
  })

  return {
    items,
    state,
    selectedId,
    expandedIds,
    activeId,
    isDragging,
    select: (id, event) => manager.select(id, event),
    add: (item, parentId, index) => manager.add(item as Parameters<typeof manager.add>[0], parentId, index),
    remove: id => manager.remove(id),
    update: (id, changes) => manager.update(id, changes),
    move: (sourceId, targetId, position) => manager.move(sourceId, targetId, position),
    toggleExpand: id => manager.toggleExpand(id),
    expand: id => manager.expand(id),
    collapse: id => manager.collapse(id),
    expandAll: () => manager.expandAll(),
    collapseAll: () => manager.collapseAll(),
    setActiveId: id => manager.setActiveId(id),
    on: (event, handler) => manager.on(event, handler),
    save: () => manager.saveToStorage(),
    load: () => manager.loadFromStorage(),
    updateItems: newItems => manager.updateItems(newItems),
    manager,
  }
}

