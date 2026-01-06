/**
 * Vue 书签类型定义
 * @module types
 */

import type { Ref, ComputedRef } from 'vue'

// 重新导出核心类型（使用别名避免冲突）
export type {
  BookmarkConfig,
  BookmarkEventMap,
  BookmarkFolderItem,
  BookmarkItem as BookmarkItemType,
  BookmarkItemPath,
  BookmarkLeafItem,
  BookmarkSeparatorItem,
  BookmarkState,
  FlatBookmarkItem,
  BookmarkSortOptions,
  BookmarkSortField,
  SortDirection,
} from '@ldesign/bookmark-core'

// ==================== 基础类型 ====================

/**
 * 书签显示模式
 */
export type BookmarkMode = 'horizontal' | 'vertical'

/**
 * 书签主题
 */
export type BookmarkTheme = 'light' | 'dark' | 'auto'

/**
 * 加载状态
 */
export type LoadingState = 'idle' | 'loading' | 'success' | 'error'

/**
 * 大小变体
 */
export type SizeVariant = 'small' | 'medium' | 'large'

/**
 * 书签栏属性
 */
export interface BookmarkBarProps {
  /**
   * 书签列表
   */
  items?: import('@ldesign/bookmark-core').BookmarkItem[]

  /**
   * 显示模式
   * @default 'horizontal'
   */
  mode?: BookmarkMode

  /**
   * 主题
   * @default 'light'
   */
  theme?: BookmarkTheme

  /**
   * 是否可拖拽
   * @default true
   */
  draggable?: boolean

  /**
   * 是否显示图标
   * @default true
   */
  showIcon?: boolean

  /**
   * 是否显示标题
   * @default true
   */
  showTitle?: boolean

  /**
   * 是否持久化
   * @default false
   */
  persistent?: boolean

  /**
   * 存储键名
   * @default 'ldesign-bookmarks'
   */
  storageKey?: string

  /**
   * 默认选中的书签 ID
   */
  defaultSelectedId?: string

  /**
   * 默认展开的文件夹 ID 列表
   */
  defaultExpandedIds?: string[]

  /**
   * 是否显示加载状态
   * @default false
   */
  loading?: boolean

  /**
   * 是否启用键盘导航
   * @default true
   */
  keyboardNavigation?: boolean

  /**
   * 大小变体
   * @default 'medium'
   */
  size?: SizeVariant

  /**
   * 最大可见项目数（超出显示更多按钮）
   */
  maxVisibleItems?: number

  /**
   * 是否显示添加按钮
   * @default false
   */
  showAddButton?: boolean

  /**
   * 空状态文本
   * @default '暂无书签'
   */
  emptyText?: string
}

/**
 * 书签项属性
 */
export interface BookmarkItemProps {
  /**
   * 书签项数据
   */
  item: import('@ldesign/bookmark-core').BookmarkItem

  /**
   * 是否可拖拽
   * @default true
   */
  draggable?: boolean

  /**
   * 是否显示 favicon
   * @default true
   */
  showFavicon?: boolean

  /**
   * 是否显示 tooltip
   * @default true
   */
  showTooltip?: boolean

  /**
   * tooltip 显示延迟（ms）
   * @default 500
   */
  tooltipDelay?: number

  /**
   * 是否高亮显示
   */
  highlighted?: boolean

  /**
   * 是否禁用
   */
  disabled?: boolean
}

/**
 * 书签文件夹属性
 */
export interface BookmarkFolderProps {
  /**
   * 文件夹数据
   */
  folder: import('@ldesign/bookmark-core').BookmarkFolderItem

  /**
   * 是否可拖拽
   * @default true
   */
  draggable?: boolean

  /**
   * 是否默认展开
   * @default false
   */
  defaultExpanded?: boolean

  /**
   * 展开动画时长（ms）
   * @default 200
   */
  animationDuration?: number
}

// ==================== 事件类型 ====================

/**
 * 书签栏事件
 */
export interface BookmarkBarEmits {
  /** 选中书签 */
  (e: 'select', item: import('@ldesign/bookmark-core').BookmarkItem, event?: Event): void
  /** 添加书签 */
  (e: 'add', item: import('@ldesign/bookmark-core').BookmarkItem): void
  /** 删除书签 */
  (e: 'remove', id: string): void
  /** 更新书签 */
  (e: 'update', id: string, changes: Partial<import('@ldesign/bookmark-core').BookmarkItem>): void
  /** 移动书签 */
  (e: 'move', id: string, targetId: string, position: 'before' | 'after' | 'inside'): void
  /** 右键菜单 */
  (e: 'contextmenu', item: import('@ldesign/bookmark-core').BookmarkItem, event: MouseEvent): void
  /** 展开/收起文件夹 */
  (e: 'expand', id: string, expanded: boolean): void
  /** 拖拽开始 */
  (e: 'drag-start', item: import('@ldesign/bookmark-core').BookmarkItem, event: DragEvent): void
  /** 拖拽结束 */
  (e: 'drag-end', item: import('@ldesign/bookmark-core').BookmarkItem, event: DragEvent): void
  /** 点击添加按钮 */
  (e: 'add-click'): void
  /** 点击更多按钮 */
  (e: 'more-click', hiddenItems: import('@ldesign/bookmark-core').BookmarkItem[]): void
}

/**
 * 书签项事件
 */
export interface BookmarkItemEmits {
  /** 点击 */
  (e: 'click', item: import('@ldesign/bookmark-core').BookmarkItem, event: MouseEvent): void
  /** 右键菜单 */
  (e: 'contextmenu', item: import('@ldesign/bookmark-core').BookmarkItem, event: MouseEvent): void
  /** 拖拽开始 */
  (e: 'drag-start', event: DragEvent): void
  /** 拖拽结束 */
  (e: 'drag-end', event: DragEvent): void
}

// ==================== 暴露类型 ====================

/**
 * BookmarkBar 组件暴露的方法
 */
export interface BookmarkBarExpose {
  /** 添加书签 */
  add: (item: import('@ldesign/bookmark-core').BookmarkItem, parentId?: string) => void
  /** 删除书签 */
  remove: (id: string) => void
  /** 更新书签 */
  update: (id: string, changes: Partial<import('@ldesign/bookmark-core').BookmarkItem>) => void
  /** 移动书签 */
  move: (id: string, targetId: string, position: 'before' | 'after' | 'inside') => void
  /** 展开所有文件夹 */
  expandAll: () => void
  /** 收起所有文件夹 */
  collapseAll: () => void
  /** 保存到存储 */
  save: () => void
  /** 从存储加载 */
  load: () => void
  /** 获取书签列表 */
  getItems: () => import('@ldesign/bookmark-core').BookmarkItem[]
  /** 获取选中的书签 ID */
  getSelectedId: () => string | undefined
  /** 搜索书签 */
  search: (query: string) => import('@ldesign/bookmark-core').BookmarkItem[]
  /** 获取统计信息 */
  getStats: () => { total: number, bookmarks: number, folders: number }
}

// ==================== 上下文类型 ====================

/**
 * 书签上下文
 */
export interface BookmarkContext {
  /** 书签列表 */
  items: Ref<import('@ldesign/bookmark-core').BookmarkItem[]>
  /** 显示模式 */
  mode: Ref<BookmarkMode>
  /** 主题 */
  theme: Ref<BookmarkTheme>
  /** 状态 */
  state: Ref<import('@ldesign/bookmark-core').BookmarkState>
  /** 是否可拖拽 */
  draggable: Ref<boolean>
  /** 是否显示图标 */
  showIcon: Ref<boolean>
  /** 是否显示标题 */
  showTitle: Ref<boolean>
  /** 选中书签 */
  select: (id: string, event?: Event) => void
  /** 添加书签 */
  add: (item: import('@ldesign/bookmark-core').BookmarkItem, parentId?: string) => void
  /** 删除书签 */
  remove: (id: string) => void
  /** 更新书签 */
  update: (id: string, changes: Partial<import('@ldesign/bookmark-core').BookmarkItem>) => void
  /** 移动书签 */
  move: (id: string, targetId: string, position: 'before' | 'after' | 'inside') => void
  /** 切换展开 */
  toggleExpand: (id: string) => void
  /** 展开 */
  expand: (id: string) => void
  /** 收起 */
  collapse: (id: string) => void
  /** 设置活动 ID */
  setActiveId: (id: string | undefined) => void
  /** 检查是否展开 */
  isExpanded: (id: string) => boolean
  /** 检查是否选中 */
  isSelected: (id: string) => boolean
  /** 检查是否活动 */
  isActive: (id: string) => boolean
}

/**
 * 文件夹上下文
 */
export interface BookmarkFolderContext {
  /** 层级 */
  level: number
  /** 父级 ID */
  parentId?: string
}

// ==================== 页签类型 ====================

/** 标签项类型（用于路由页签管理） */
export interface TabItem {
  /** 唯一标识 */
  key: string
  /** 显示标题 */
  title: string
  /** 图标 */
  icon?: string
  /** 是否可关闭 @default true */
  closable?: boolean
  /** 是否固定/锁定 @default false */
  pinned?: boolean
  /** 路由路径 */
  path?: string
  /** 是否是首页 */
  isHome?: boolean
  /** 刷新键（用于触发组件刷新） */
  refreshKey?: number
}

/** 页签右键菜单项 */
export interface TabContextMenuItem {
  /** 菜单项标识 */
  value: string
  /** 菜单项标签 */
  label: string
  /** 菜单项图标 */
  icon?: string
  /** 是否禁用 */
  disabled?: boolean
}

/** 页签右键菜单动作类型 */
export type TabContextAction =
  | 'refresh'
  | 'lock'
  | 'unlock'
  | 'close'
  | 'close-left'
  | 'close-right'
  | 'close-other'
  | 'close-all'

/** 页签样式变体 */
export type TabVariant = 'default' | 'chrome' | 'card' | 'line'

// ==================== Chrome 标签页类型 ====================

/**
 * Chrome 标签页样式变体
 */
export type ChromeTabVariant = 'chrome' | 'card' | 'line' | 'rounded'

/**
 * Chrome 标签页右键菜单动作
 */
export type ChromeTabContextAction =
  | 'refresh'
  | 'lock'
  | 'unlock'
  | 'close'
  | 'close-left'
  | 'close-right'
  | 'close-other'
  | 'close-all'

/**
 * Chrome 标签页项
 */
export interface ChromeTabItem {
  /** 标签唯一标识 */
  key: string
  /** 标签标题 */
  title: string
  /** 标签图标（可选） */
  icon?: string
  /** 是否可关闭 @default true */
  closable?: boolean
  /** 是否固定 */
  pinned?: boolean
  /** 是否是首页 */
  isHome?: boolean
  /** 刷新键，用于触发页面刷新 */
  refreshKey?: number
  /** 额外数据 */
  meta?: Record<string, unknown>
}

/**
 * Chrome 标签页组件属性
 */
export interface ChromeTabsProps {
  /** 标签列表 */
  tabs?: ChromeTabItem[]
  /** 当前激活的标签 key */
  activeKey?: string
  /** 标签栏高度 @default 40 */
  height?: number
  /** 是否显示添加按钮 @default false */
  showAdd?: boolean
  /** 是否显示更多操作按钮 @default false */
  showMore?: boolean
  /** 样式变体 @default 'chrome' */
  variant?: ChromeTabVariant
  /** 最大标签数量 @default 20 */
  maxTabs?: number
  /** 是否显示标签图标 @default true */
  showIcon?: boolean
}
