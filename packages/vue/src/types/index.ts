/**
 * Vue 书签类型定义
 * @module types
 */

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
} from '@ldesign/bookmark-core'

/**
 * 书签显示模式
 */
export type BookmarkMode = 'horizontal' | 'vertical'

/**
 * 书签主题
 */
export type BookmarkTheme = 'light' | 'dark' | 'auto'

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
