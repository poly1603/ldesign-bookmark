/**
 * 书签上下文管理
 * @module composables/useBookmark
 */

import type { BookmarkItem } from '@ldesign/bookmark-core'
import type { InjectionKey, Ref } from 'vue'
import type { BookmarkItemType, BookmarkMode, BookmarkState, BookmarkTheme } from '../types'
import { inject, provide } from 'vue'

/**
 * 书签上下文
 */
export interface BookmarkContext {
  /**
   * 书签列表
   */
  items: Ref<BookmarkItem[]>

  /**
   * 显示模式
   */
  mode: Ref<BookmarkMode>

  /**
   * 主题
   */
  theme: Ref<BookmarkTheme>

  /**
   * 当前状态
   */
  state: BookmarkState

  /**
   * 是否启用拖拽
   */
  draggable: Ref<boolean>

  /**
   * 是否显示图标
   */
  showIcon: Ref<boolean>

  /**
   * 是否显示标题
   */
  showTitle: Ref<boolean>

  /**
   * 选中书签
   */
  select: (id: string, event?: Event) => void

  /**
   * 添加书签
   */
  add: (item: Omit<BookmarkItem, 'id'>, parentId?: string, index?: number) => BookmarkItem

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
   * 设置悬停的书签
   */
  setActiveId: (id: string | null) => void

  /**
   * 获取书签是否展开
   */
  isExpanded: (id: string) => boolean

  /**
   * 获取书签是否选中
   */
  isSelected: (id: string) => boolean

  /**
   * 获取书签是否激活（悬停）
   */
  isActive: (id: string) => boolean
}

/**
 * 书签上下文注入键
 */
export const BOOKMARK_CONTEXT_KEY: InjectionKey<BookmarkContext> = Symbol('bookmark-context')

/**
 * 文件夹上下文
 */
export interface BookmarkFolderContext {
  /**
   * 当前层级
   */
  level: number

  /**
   * 父级 ID
   */
  parentId?: string
}

/**
 * 文件夹上下文注入键
 */
export const BOOKMARK_FOLDER_CONTEXT_KEY: InjectionKey<BookmarkFolderContext> = Symbol('bookmark-folder-context')

/**
 * 提供书签上下文
 * @param context - 书签上下文
 */
export function provideBookmarkContext(context: BookmarkContext): void {
  provide(BOOKMARK_CONTEXT_KEY, context)
}

/**
 * 注入书签上下文
 * @returns 书签上下文
 * @throws 如果未在 BookmarkBar 组件内部使用会抛出错误
 */
export function useBookmarkContext(): BookmarkContext {
  const context = inject(BOOKMARK_CONTEXT_KEY)
  if (!context) {
    throw new Error('[LBookmark] useBookmarkContext must be used inside a BookmarkBar component')
  }
  return context
}

/**
 * 提供文件夹上下文
 * @param context - 文件夹上下文
 */
export function provideBookmarkFolderContext(context: BookmarkFolderContext): void {
  provide(BOOKMARK_FOLDER_CONTEXT_KEY, context)
}

/**
 * 注入文件夹上下文
 * @returns 文件夹上下文，如果不在文件夹内则返回默认值
 */
export function useBookmarkFolderContext(): BookmarkFolderContext {
  return inject(BOOKMARK_FOLDER_CONTEXT_KEY, { level: 0 })
}

/**
 * 获取当前书签项的层级
 * @returns 当前层级
 */
export function useBookmarkLevel(): number {
  const context = useBookmarkFolderContext()
  return context.level
}

