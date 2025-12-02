/**
 * @ldesign/bookmark-vue
 * LDesign 书签系统 - Vue 3 适配器
 * @packageDocumentation
 */

import type { App, Plugin } from 'vue'
import { BookmarkBar, BookmarkFolder, BookmarkItem, ChromeTabs } from './components'

// 导出组件
export * from './components'

// 导出 Composables
export * from './composables'

// 导出类型
export * from './types'

// 从核心包重新导出
export {
  BookmarkCache,
  BookmarkHistory,
  BookmarkManager,
  EventEmitter,
  findItemById,
  flattenItems,
  generateId,
  getItemId,
  getItemPath,
  getParentIds,
  isBookmark,
  isFolder,
  isHidden,
  isPinned,
  isSeparator,
} from '@ldesign/bookmark-core'

/**
 * 书签插件配置
 */
export interface BookmarkPluginOptions {
  /**
   * 组件前缀
   * @default 'L'
   */
  prefix?: string
}

/**
 * 书签插件
 * 用于全局注册书签组件
 */
export const BookmarkPlugin: Plugin = {
  install(app: App, options: BookmarkPluginOptions = {}) {
    const prefix = options.prefix ?? 'L'

    // 注册组件
    app.component(`${prefix}BookmarkBar`, BookmarkBar)
    app.component(`${prefix}BookmarkFolder`, BookmarkFolder)
    app.component(`${prefix}BookmarkItem`, BookmarkItem)
    app.component(`${prefix}ChromeTabs`, ChromeTabs)
  },
}

// 默认导出插件
export default BookmarkPlugin

