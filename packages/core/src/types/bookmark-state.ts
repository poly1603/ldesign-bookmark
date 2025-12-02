/**
 * 书签状态类型定义
 * @module types/bookmark-state
 */

import type { BookmarkItem, BookmarkItemPath } from './bookmark-item'

/**
 * 书签状态接口
 */
export interface BookmarkState {
  /**
   * 当前选中的书签项 id
   */
  selectedId?: string

  /**
   * 当前激活（悬停）的书签项 id
   */
  activeId?: string

  /**
   * 展开的文件夹 id 列表
   */
  expandedIds: string[]

  /**
   * 是否正在拖拽
   */
  isDragging: boolean

  /**
   * 拖拽源书签 id
   */
  dragSourceId?: string

  /**
   * 拖拽目标书签 id
   */
  dragTargetId?: string

  /**
   * 是否正在编辑
   */
  isEditing: boolean

  /**
   * 正在编辑的书签 id
   */
  editingId?: string

  /**
   * 搜索关键词
   */
  searchKeyword?: string
}

/**
 * 默认书签状态
 */
export const DEFAULT_BOOKMARK_STATE: BookmarkState = {
  selectedId: undefined,
  activeId: undefined,
  expandedIds: [],
  isDragging: false,
  dragSourceId: undefined,
  dragTargetId: undefined,
  isEditing: false,
  editingId: undefined,
  searchKeyword: undefined,
}

/**
 * 书签选中事件参数
 */
export interface BookmarkSelectEventParams {
  /** 书签 id */
  id: string
  /** 书签项 */
  item: BookmarkItem
  /** 书签路径 */
  path: BookmarkItemPath
  /** 原始事件 */
  event?: Event
}

/**
 * 书签添加事件参数
 */
export interface BookmarkAddEventParams {
  /** 书签项 */
  item: BookmarkItem
  /** 父文件夹 id（如果有） */
  parentId?: string
  /** 插入位置索引 */
  index?: number
}

/**
 * 书签删除事件参数
 */
export interface BookmarkRemoveEventParams {
  /** 书签 id */
  id: string
  /** 被删除的书签项 */
  item: BookmarkItem
}

/**
 * 书签更新事件参数
 */
export interface BookmarkUpdateEventParams {
  /** 书签 id */
  id: string
  /** 更新后的书签项 */
  item: BookmarkItem
  /** 更新的字段 */
  changes: Partial<BookmarkItem>
}

/**
 * 书签排序事件参数
 */
export interface BookmarkReorderEventParams {
  /** 源书签 id */
  sourceId: string
  /** 目标书签 id */
  targetId: string
  /** 放置位置 */
  position: 'before' | 'after' | 'inside'
}

/**
 * 书签文件夹展开事件参数
 */
export interface BookmarkExpandEventParams {
  /** 文件夹 id */
  id: string
  /** 是否展开 */
  expanded: boolean
  /** 当前展开的文件夹 id 列表 */
  expandedIds: string[]
}

/**
 * 书签悬停事件参数
 */
export interface BookmarkHoverEventParams {
  /** 书签 id（null 表示离开） */
  id: string | null
  /** 书签项 */
  item: BookmarkItem | null
}

/**
 * 书签事件映射
 */
export interface BookmarkEventMap {
  /** 选中书签 */
  select: BookmarkSelectEventParams
  /** 添加书签 */
  add: BookmarkAddEventParams
  /** 删除书签 */
  remove: BookmarkRemoveEventParams
  /** 更新书签 */
  update: BookmarkUpdateEventParams
  /** 重新排序 */
  reorder: BookmarkReorderEventParams
  /** 文件夹展开/收起 */
  expand: BookmarkExpandEventParams
  /** 悬停 */
  hover: BookmarkHoverEventParams
  /** 数据变更（任何变化都会触发） */
  change: { items: BookmarkItem[] }
  /** 存储同步 */
  sync: { items: BookmarkItem[] }
}

/**
 * 书签事件处理器类型
 */
export type BookmarkEventHandler<K extends keyof BookmarkEventMap> = (
  params: BookmarkEventMap[K]
) => void

