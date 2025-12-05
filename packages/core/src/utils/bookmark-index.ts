/**
 * 书签索引管理器
 * 使用 Map 提供 O(1) 的查找性能
 * @module utils/bookmark-index
 */

import type { BookmarkItem } from '../types'
import { getItemId, isFolder } from './bookmark-utils'

/**
 * 书签索引类
 * 提供快速查找和缓存功能
 */
export class BookmarkIndex {
  /** ID 到书签项的映射 */
  private itemMap = new Map<string, BookmarkItem>()
  
  /** ID 到父级 ID 的映射 */
  private parentMap = new Map<string, string>()
  
  /** ID 到路径的映射 */
  private pathMap = new Map<string, string[]>()

  /**
   * 构建索引
   * @param items - 书签列表
   */
  build(items: BookmarkItem[]): void {
    this.clear()
    this.buildRecursive(items, undefined, [])
  }

  /**
   * 递归构建索引
   */
  private buildRecursive(
    items: BookmarkItem[],
    parentId: string | undefined,
    path: string[],
  ): void {
    for (const item of items) {
      const id = getItemId(item)
      if (!id) continue

      // 构建 ID 映射
      this.itemMap.set(id, item)

      // 构建父级映射
      if (parentId) {
        this.parentMap.set(id, parentId)
      }

      // 构建路径映射
      const currentPath = [...path, id]
      this.pathMap.set(id, currentPath)

      // 递归处理子项
      if (isFolder(item) && item.children) {
        this.buildRecursive(item.children, id, currentPath)
      }
    }
  }

  /**
   * 根据 ID 查找书签项 - O(1) 时间复杂度
   * @param id - 书签 ID
   * @returns 书签项
   */
  get(id: string): BookmarkItem | undefined {
    return this.itemMap.get(id)
  }

  /**
   * 获取父级 ID
   * @param id - 书签 ID
   * @returns 父级 ID
   */
  getParentId(id: string): string | undefined {
    return this.parentMap.get(id)
  }

  /**
   * 获取所有父级 ID 列表
   * @param id - 书签 ID
   * @returns 父级 ID 列表
   */
  getParentIds(id: string): string[] {
    const parents: string[] = []
    let currentId: string | undefined = id

    while (currentId) {
      currentId = this.parentMap.get(currentId)
      if (currentId) {
        parents.unshift(currentId)
      }
    }

    return parents
  }

  /**
   * 获取路径
   * @param id - 书签 ID
   * @returns 路径 ID 数组
   */
  getPath(id: string): string[] {
    return this.pathMap.get(id) || []
  }

  /**
   * 检查是否存在
   * @param id - 书签 ID
   * @returns 是否存在
   */
  has(id: string): boolean {
    return this.itemMap.has(id)
  }

  /**
   * 获取所有 ID
   * @returns ID 数组
   */
  getAllIds(): string[] {
    return Array.from(this.itemMap.keys())
  }

  /**
   * 获取索引大小
   * @returns 索引中的项数
   */
  get size(): number {
    return this.itemMap.size
  }

  /**
   * 清除索引
   */
  clear(): void {
    this.itemMap.clear()
    this.parentMap.clear()
    this.pathMap.clear()
  }

  /**
   * 更新单个项
   * @param id - 书签 ID
   * @param item - 新的书签项
   */
  update(id: string, item: BookmarkItem): void {
    if (this.itemMap.has(id)) {
      this.itemMap.set(id, item)
    }
  }

  /**
   * 删除项
   * @param id - 书签 ID
   */
  delete(id: string): void {
    this.itemMap.delete(id)
    this.parentMap.delete(id)
    this.pathMap.delete(id)
  }
}