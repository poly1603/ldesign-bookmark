/**
 * 书签工具函数汇总
 * @module utils
 */

export { EventEmitter, type EventHandler } from './event-emitter'
export { BookmarkIndex } from './bookmark-index'

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

