/**
 * 拖拽排序 Composable
 * 提供书签拖拽排序功能
 * @module composables/useDragSort
 */

import { ref, type Ref } from 'vue'
import type { BookmarkItem } from '@ldesign/bookmark-core'

/**
 * 拖拽状态
 */
export interface DragState {
  /** 是否正在拖拽 */
  isDragging: boolean
  /** 拖拽的项 */
  dragItem: BookmarkItem | null
  /** 拖拽源 ID */
  dragSourceId: string | null
  /** 放置目标 ID */
  dropTargetId: string | null
  /** 放置位置 */
  dropPosition: 'before' | 'after' | 'inside' | null
}

/**
 * 拖拽配置
 */
export interface DragSortOptions {
  /** 拖拽延迟（ms），避免误触 */
  delay?: number
  /** 是否允许跨文件夹拖拽 */
  allowCrossFolder?: boolean
  /** 拖拽开始回调 */
  onDragStart?: (item: BookmarkItem) => void
  /** 拖拽结束回调 */
  onDragEnd?: (item: BookmarkItem) => void
  /** 放置回调 */
  onDrop?: (sourceId: string, targetId: string, position: 'before' | 'after' | 'inside') => void
}

/**
 * 使用拖拽排序
 */
export function useDragSort(options: DragSortOptions = {}) {
  const {
    delay = 150,
    allowCrossFolder = true,
    onDragStart,
    onDragEnd,
    onDrop,
  } = options

  // 拖拽状态
  const dragState = ref<DragState>({
    isDragging: false,
    dragItem: null,
    dragSourceId: null,
    dropTargetId: null,
    dropPosition: null,
  })

  // 拖拽定时器
  let dragTimer: NodeJS.Timeout | null = null

  /**
   * 开始拖拽
   */
  function handleDragStart(item: BookmarkItem, event: DragEvent): void {
    if (!event.dataTransfer) return

    // 设置延迟以避免误触
    dragTimer = setTimeout(() => {
      dragState.value = {
        isDragging: true,
        dragItem: item,
        dragSourceId: 'id' in item ? item.id : null,
        dropTargetId: null,
        dropPosition: null,
      }

      // 设置拖拽数据
      event.dataTransfer!.effectAllowed = 'move'
      event.dataTransfer!.setData('text/plain', JSON.stringify(item))

      // 设置拖拽图像
      if (event.dataTransfer.setDragImage) {
        const dragImage = createDragImage(item)
        event.dataTransfer.setDragImage(dragImage, 0, 0)
      }

      onDragStart?.(item)
    }, delay)
  }

  /**
   * 拖拽进入
   */
  function handleDragEnter(targetItem: BookmarkItem, event: DragEvent): void {
    event.preventDefault()
    
    if (!dragState.value.isDragging) return
    if (!('id' in targetItem)) return

    dragState.value.dropTargetId = targetItem.id
  }

  /**
   * 拖拽悬停
   */
  function handleDragOver(targetItem: BookmarkItem, event: DragEvent): void {
    event.preventDefault()
    
    if (!dragState.value.isDragging) return
    if (!('id' in targetItem)) return
    if (!event.dataTransfer) return

    // 计算放置位置
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
    const mouseY = event.clientY - rect.top
    const height = rect.height

    let position: 'before' | 'after' | 'inside' = 'after'

    if (targetItem.type === 'folder') {
      // 文件夹：上1/4为before，下1/4为after，中间为inside
      if (mouseY < height * 0.25) {
        position = 'before'
      } else if (mouseY > height * 0.75) {
        position = 'after'
      } else {
        position = 'inside'
      }
    } else {
      // 普通项：上半部分为before，下半部分为after
      position = mouseY < height / 2 ? 'before' : 'after'
    }

    dragState.value.dropPosition = position
    event.dataTransfer.dropEffect = 'move'
  }

  /**
   * 拖拽离开
   */
  function handleDragLeave(targetItem: BookmarkItem, event: DragEvent): void {
    if (!('id' in targetItem)) return
    
    // 只有当离开当前目标时才清除
    if (dragState.value.dropTargetId === targetItem.id) {
      const relatedTarget = event.relatedTarget as HTMLElement
      const currentTarget = event.currentTarget as HTMLElement
      
      if (!currentTarget.contains(relatedTarget)) {
        dragState.value.dropTargetId = null
        dragState.value.dropPosition = null
      }
    }
  }

  /**
   * 放置
   */
  function handleDrop(targetItem: BookmarkItem, event: DragEvent): void {
    event.preventDefault()
    
    if (!dragState.value.isDragging) return
    if (!('id' in targetItem)) return
    if (!dragState.value.dragSourceId) return

    const sourceId = dragState.value.dragSourceId
    const targetId = targetItem.id
    const position = dragState.value.dropPosition || 'after'

    // 不能拖拽到自己
    if (sourceId === targetId) {
      resetDragState()
      return
    }

    // 执行放置
    onDrop?.(sourceId, targetId, position)

    resetDragState()
  }

  /**
   * 拖拽结束
   */
  function handleDragEnd(item: BookmarkItem, event: DragEvent): void {
    if (dragTimer) {
      clearTimeout(dragTimer)
      dragTimer = null
    }

    if (dragState.value.isDragging) {
      onDragEnd?.(item)
    }

    resetDragState()
  }

  /**
   * 重置拖拽状态
   */
  function resetDragState(): void {
    dragState.value = {
      isDragging: false,
      dragItem: null,
      dragSourceId: null,
      dropTargetId: null,
      dropPosition: null,
    }
  }

  /**
   * 创建拖拽图像
   */
  function createDragImage(item: BookmarkItem): HTMLElement {
    const div = document.createElement('div')
    div.className = 'l-bookmark-drag-image'
    div.style.cssText = `
      position: fixed;
      top: -9999px;
      left: -9999px;
      padding: 8px 12px;
      background: rgba(24, 144, 255, 0.1);
      border: 1px solid #1890ff;
      border-radius: 4px;
      font-size: 14px;
      color: #1890ff;
      white-space: nowrap;
      pointer-events: none;
      z-index: 9999;
    `
    
    const title = 'title' in item ? item.title : '未命名'
    div.textContent = `📌 ${title}`
    
    document.body.appendChild(div)
    
    // 拖拽结束后移除
    setTimeout(() => {
      document.body.removeChild(div)
    }, 0)
    
    return div
  }

  /**
   * 检查是否可以放置
   */
  function canDrop(sourceId: string, targetId: string): boolean {
    // 不能拖拽到自己
    if (sourceId === targetId) {
      return false
    }

    // TODO: 添加更多验证逻辑
    // - 不能拖拽父文件夹到子文件夹
    // - 检查循环依赖

    return true
  }

  return {
    dragState,
    handleDragStart,
    handleDragEnter,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleDragEnd,
    canDrop,
  }
}