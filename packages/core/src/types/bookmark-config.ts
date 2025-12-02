/**
 * 书签配置类型定义
 * @module types/bookmark-config
 */

import type { BookmarkItem } from './bookmark-item'

/**
 * 书签栏显示模式
 * - `horizontal`: 水平模式
 * - `vertical`: 垂直模式
 */
export type BookmarkMode = 'horizontal' | 'vertical'

/**
 * 书签主题
 */
export type BookmarkTheme = 'light' | 'dark'

/**
 * 书签配置接口
 */
export interface BookmarkConfig {
  /**
   * 书签数据列表
   */
  items: BookmarkItem[]

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
   * 是否启用拖拽排序
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
   * 最大可见书签数量（超出显示"更多"）
   * @default -1 表示不限制
   */
  maxVisible?: number

  /**
   * 是否启用右键菜单
   * @default true
   */
  contextMenu?: boolean

  /**
   * 是否启用本地存储持久化
   * @default true
   */
  persistent?: boolean

  /**
   * 本地存储键名
   * @default 'ldesign-bookmarks'
   */
  storageKey?: string

  /**
   * 是否自动同步到本地存储
   * @default true
   */
  autoSync?: boolean

  /**
   * 新建书签时默认打开方式
   * @default '_self'
   */
  defaultTarget?: '_self' | '_blank'

  /**
   * 是否启用快捷键
   * @default true
   */
  shortcuts?: boolean

  /**
   * 空状态文案
   * @default '暂无书签'
   */
  emptyText?: string
}

/**
 * 默认书签配置
 */
export const DEFAULT_BOOKMARK_CONFIG: Required<Omit<BookmarkConfig, 'items'>> & { items: BookmarkItem[] } = {
  items: [],
  mode: 'horizontal',
  theme: 'light',
  draggable: true,
  showIcon: true,
  showTitle: true,
  maxVisible: -1,
  contextMenu: true,
  persistent: true,
  storageKey: 'ldesign-bookmarks',
  autoSync: true,
  defaultTarget: '_self',
  shortcuts: true,
  emptyText: '暂无书签',
}

