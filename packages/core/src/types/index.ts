/**
 * 书签类型定义汇总
 * @module types
 */

// 书签项类型
export type {
  BookmarkFolderItem,
  BookmarkItem,
  BookmarkItemBase,
  BookmarkItemPath,
  BookmarkItemType,
  BookmarkLeafItem,
  BookmarkSeparatorItem,
  BookmarkTarget,
  FlatBookmarkItem,
} from './bookmark-item'

// 书签配置类型
export type {
  BookmarkConfig,
  BookmarkMode,
  BookmarkTheme,
} from './bookmark-config'

export { DEFAULT_BOOKMARK_CONFIG } from './bookmark-config'

// 书签状态类型
export type {
  BookmarkAddEventParams,
  BookmarkEventHandler,
  BookmarkEventMap,
  BookmarkExpandEventParams,
  BookmarkHoverEventParams,
  BookmarkRemoveEventParams,
  BookmarkReorderEventParams,
  BookmarkSelectEventParams,
  BookmarkState,
  BookmarkUpdateEventParams,
} from './bookmark-state'

export { DEFAULT_BOOKMARK_STATE } from './bookmark-state'

