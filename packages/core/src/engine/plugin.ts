/**
 * @ldesign/bookmark Engine 插件
 */
import type { BookmarkEnginePluginOptions } from './types'
import { BookmarkManager } from '../managers/bookmark-manager'

export const bookmarkStateKeys = {
  MANAGER: 'bookmark:manager' as const,
} as const

export const bookmarkEventKeys = {
  INSTALLED: 'bookmark:installed' as const,
  UNINSTALLED: 'bookmark:uninstalled' as const,
  ADDED: 'bookmark:added' as const,
  REMOVED: 'bookmark:removed' as const,
} as const

export function createBookmarkEnginePlugin(options: BookmarkEnginePluginOptions = {}) {
  let manager: BookmarkManager | null = null
  return {
    name: 'bookmark',
    version: '1.0.0',
    dependencies: options.dependencies ?? [],

    async install(context: any) {
      const engine = context.engine || context
      manager = new BookmarkManager(options as any)
      engine.state?.set(bookmarkStateKeys.MANAGER, manager)
      engine.events?.emit(bookmarkEventKeys.INSTALLED, { name: 'bookmark' })
      engine.logger?.info('[Bookmark Plugin] installed')
    },

    async uninstall(context: any) {
      const engine = context.engine || context
      manager?.destroy?.(); manager = null
      engine.state?.delete(bookmarkStateKeys.MANAGER)
      engine.events?.emit(bookmarkEventKeys.UNINSTALLED, {})
      engine.logger?.info('[Bookmark Plugin] uninstalled')
    },
  }
}
