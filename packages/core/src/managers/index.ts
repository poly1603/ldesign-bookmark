/**
 * 书签管理器汇总
 * @module managers
 * @description 导出所有书签管理器类和类型
 */

export { BookmarkCache, type BookmarkCacheConfig } from './bookmark-cache'
export { BookmarkHistory, type BookmarkHistoryConfig, type HistoryEntry, type VisitEntry } from './bookmark-history'
export {
  BookmarkManager,
  type BatchOperationResult,
  type BookmarkExportData,
  type BookmarkManagerConfig,
} from './bookmark-manager'

