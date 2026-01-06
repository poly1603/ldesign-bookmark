/**
 * 书签工具函数汇总
 * @module utils
 */

export {
  EventEmitter,
  type EventHandler,
  type AsyncEventHandler,
  type EventHandlerOptions,
} from './event-emitter'
export {
  BookmarkIndex,
  type SearchOptions,
  type SearchResult,
} from './bookmark-index'

// 基础工具函数
export {
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
} from './bookmark-utils'

// 新增工具函数
export {
  cloneBookmark,
  mergeBookmarks,
  validateBookmark,
  sortBookmarks,
  countBookmarks,
  filterBookmarks,
} from './bookmark-utils'

