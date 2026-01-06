<script setup lang="ts">
/**
 * 书签项组件
 * 渲染单个书签或文件夹，支持 favicon、tooltip、多种状态
 *
 * @example
 * ```vue
 * <BookmarkItem
 *   :item="bookmark"
 *   :show-favicon="true"
 *   :show-tooltip="true"
 *   @click="handleClick"
 * />
 * ```
 */
import type { BookmarkItem as BookmarkItemType, BookmarkLeafItem } from '@ldesign/bookmark-core'
import { isFolder, isBookmark } from '@ldesign/bookmark-core'
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useBookmarkContext, useBookmarkFolderContext } from '../composables/useBookmark'

/**
 * 组件属性
 */
interface Props {
  /** 书签项数据 */
  item: BookmarkItemType
  /** 是否可拖拽 */
  draggable?: boolean
  /** 是否显示 favicon */
  showFavicon?: boolean
  /** 是否显示 tooltip */
  showTooltip?: boolean
  /** tooltip 显示延迟（ms） */
  tooltipDelay?: number
  /** 是否高亮显示 */
  highlighted?: boolean
  /** 是否禁用 */
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  draggable: true,
  showFavicon: true,
  showTooltip: true,
  tooltipDelay: 500,
  highlighted: false,
  disabled: false,
})

/**
 * 组件事件
 */
const emit = defineEmits<{
  /** 点击事件 */
  click: [item: BookmarkItemType, event: MouseEvent]
  /** 右键菜单事件 */
  contextmenu: [item: BookmarkItemType, event: MouseEvent]
  /** 拖拽开始 */
  'drag-start': [event: DragEvent]
  /** 拖拽结束 */
  'drag-end': [event: DragEvent]
}>()

// 注入书签上下文
const bookmarkContext = useBookmarkContext()
const folderContext = useBookmarkFolderContext()

// 计算属性
const itemId = computed(() => ('id' in props.item ? props.item.id : undefined))
const itemTitle = computed(() => ('title' in props.item ? props.item.title : ''))
const itemIcon = computed(() => ('icon' in props.item ? props.item.icon : undefined))
const itemUrl = computed(() => ('url' in props.item ? props.item.url : undefined))
const isItemFolder = computed(() => isFolder(props.item))
const isItemSeparator = computed(() => props.item.type === 'separator')
const isItemBookmark = computed(() => isBookmark(props.item))

// 状态
const isSelected = computed(() => itemId.value ? bookmarkContext.isSelected(itemId.value) : false)
const isActive = computed(() => itemId.value ? bookmarkContext.isActive(itemId.value) : false)
const isExpanded = computed(() => itemId.value ? bookmarkContext.isExpanded(itemId.value) : false)

// 层级缩进
const indent = computed(() => folderContext.level * 16)

// Favicon 相关
const faviconUrl = computed(() => {
  if (!props.showFavicon || !isItemBookmark.value) return null

  const bookmark = props.item as BookmarkLeafItem
  // 优先使用自定义 favicon
  if (bookmark.favicon) return bookmark.favicon

  // 从 URL 生成 favicon URL
  if (bookmark.url) {
    try {
      const url = new URL(bookmark.url)
      return `https://www.google.com/s2/favicons?domain=${url.hostname}&sz=32`
    } catch {
      return null
    }
  }
  return null
})

const faviconError = ref(false)
function handleFaviconError(): void {
  faviconError.value = true
}

// Tooltip 相关
const showTooltipState = ref(false)
const tooltipTimer = ref<ReturnType<typeof setTimeout> | null>(null)

const tooltipContent = computed(() => {
  if (!props.showTooltip) return ''

  const parts: string[] = []
  if (itemTitle.value) parts.push(itemTitle.value)
  if (itemUrl.value) parts.push(itemUrl.value)

  // 添加额外信息
  if (isItemBookmark.value) {
    const bookmark = props.item as BookmarkLeafItem
    if (bookmark.description) parts.push(bookmark.description)
    if (bookmark.tags?.length) parts.push(`标签: ${bookmark.tags.join(', ')}`)
  }

  return parts.join('\n')
})

function startTooltipTimer(): void {
  if (!props.showTooltip || props.disabled) return
  tooltipTimer.value = setTimeout(() => {
    showTooltipState.value = true
  }, props.tooltipDelay)
}

function clearTooltipTimer(): void {
  if (tooltipTimer.value) {
    clearTimeout(tooltipTimer.value)
    tooltipTimer.value = null
  }
  showTooltipState.value = false
}

onUnmounted(() => {
  clearTooltipTimer()
})

/**
 * 处理点击
 */
function handleClick(event: MouseEvent): void {
  if (props.disabled) return

  if (itemId.value) {
    bookmarkContext.select(itemId.value, event)
  }
  emit('click', props.item, event)
}

/**
 * 处理右键菜单
 */
function handleContextMenu(event: MouseEvent): void {
  event.preventDefault()
  if (props.disabled) return
  emit('contextmenu', props.item, event)
}

/**
 * 处理鼠标进入
 */
function handleMouseEnter(): void {
  if (props.disabled) return
  if (itemId.value) {
    bookmarkContext.setActiveId(itemId.value)
  }
  startTooltipTimer()
}

/**
 * 处理鼠标离开
 */
function handleMouseLeave(): void {
  bookmarkContext.setActiveId(undefined)
  clearTooltipTimer()
}

/**
 * 处理拖拽开始
 */
function handleDragStart(event: DragEvent): void {
  if (!props.draggable || !itemId.value || props.disabled) {
    event.preventDefault()
    return
  }
  event.dataTransfer?.setData('text/plain', itemId.value)
  event.dataTransfer?.setData('application/json', JSON.stringify(props.item))
  emit('drag-start', event)
}

/**
 * 处理拖拽结束
 */
function handleDragEnd(event: DragEvent): void {
  emit('drag-end', event)
}

/**
 * 获取访问次数显示
 */
const visitCountDisplay = computed(() => {
  if (!isItemBookmark.value) return null
  const bookmark = props.item as BookmarkLeafItem
  if (typeof bookmark.visitCount !== 'number') return null
  return bookmark.visitCount > 999 ? '999+' : String(bookmark.visitCount)
})
</script>

<template>
  <!-- 分隔线 -->
  <div
    v-if="isItemSeparator"
    class="l-bookmark-separator"
    role="separator"
  />

  <!-- 书签项 -->
  <div
    v-else
    class="l-bookmark-item"
    :class="{
      'l-bookmark-item--selected': isSelected,
      'l-bookmark-item--active': isActive,
      'l-bookmark-item--folder': isItemFolder,
      'l-bookmark-item--expanded': isExpanded,
      'l-bookmark-item--highlighted': highlighted,
      'l-bookmark-item--disabled': disabled,
    }"
    :style="{ paddingLeft: `${indent}px` }"
    :draggable="draggable && !disabled"
    :tabindex="disabled ? -1 : 0"
    role="treeitem"
    :aria-selected="isSelected"
    :aria-expanded="isItemFolder ? isExpanded : undefined"
    :aria-disabled="disabled"
    :title="showTooltip ? tooltipContent : undefined"
    @click="handleClick"
    @contextmenu="handleContextMenu"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
    @dragstart="handleDragStart"
    @dragend="handleDragEnd"
  >
    <!-- Favicon / 图标 -->
    <span class="l-bookmark-item__icon">
      <slot name="icon" :item="item" :is-folder="isItemFolder" :is-expanded="isExpanded">
        <!-- Favicon -->
        <img
          v-if="faviconUrl && !faviconError"
          :src="faviconUrl"
          class="l-bookmark-item__favicon"
          alt=""
          loading="lazy"
          @error="handleFaviconError"
        />
        <!-- 默认图标 -->
        <span v-else class="l-bookmark-item__default-icon">
          {{ isItemFolder ? (isExpanded ? '📂' : '📁') : '🔖' }}
        </span>
      </slot>
    </span>

    <!-- 标题 -->
    <span class="l-bookmark-item__title">
      <slot name="title" :item="item">
        {{ itemTitle }}
      </slot>
    </span>

    <!-- 访问次数徽章 -->
    <span
      v-if="visitCountDisplay"
      class="l-bookmark-item__badge"
      :title="`访问次数: ${visitCountDisplay}`"
    >
      {{ visitCountDisplay }}
    </span>

    <!-- 展开箭头 -->
    <span v-if="isItemFolder" class="l-bookmark-item__arrow">
      <slot name="arrow" :is-expanded="isExpanded">
        <svg
          class="l-bookmark-item__arrow-icon"
          :class="{ 'l-bookmark-item__arrow-icon--expanded': isExpanded }"
          viewBox="0 0 24 24"
          width="12"
          height="12"
        >
          <path fill="currentColor" d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z" />
        </svg>
      </slot>
    </span>

    <!-- 额外内容插槽 -->
    <slot name="extra" :item="item" />
  </div>
</template>

<style>
.l-bookmark-separator {
  height: 1px;
  margin: 4px 8px;
  background-color: var(--l-bookmark-separator-color, #e0e0e0);
}

.l-bookmark-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s ease;
  user-select: none;
  outline: none;
}

.l-bookmark-item:hover,
.l-bookmark-item--active {
  background-color: var(--l-bookmark-item-hover-bg, #f5f5f5);
}

.l-bookmark-item:focus-visible {
  box-shadow: 0 0 0 2px var(--l-bookmark-focus-ring, #2196f3);
}

.l-bookmark-item--selected {
  background-color: var(--l-bookmark-item-selected-bg, #e3f2fd);
}

.l-bookmark-item--highlighted {
  background-color: var(--l-bookmark-item-highlight-bg, #fff3e0);
}

.l-bookmark-item--disabled {
  opacity: 0.5;
  cursor: not-allowed;
  pointer-events: none;
}

.l-bookmark-item__icon {
  flex-shrink: 0;
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.l-bookmark-item__favicon {
  width: 16px;
  height: 16px;
  object-fit: contain;
  border-radius: 2px;
}

.l-bookmark-item__default-icon {
  font-size: 14px;
  line-height: 1;
}

.l-bookmark-item__title {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 14px;
  color: var(--l-bookmark-item-color, #333);
}

.l-bookmark-item__badge {
  flex-shrink: 0;
  padding: 0 6px;
  height: 16px;
  line-height: 16px;
  font-size: 10px;
  background-color: var(--l-bookmark-badge-bg, #e0e0e0);
  color: var(--l-bookmark-badge-color, #666);
  border-radius: 8px;
}

.l-bookmark-item__arrow {
  flex-shrink: 0;
  color: var(--l-bookmark-arrow-color, #999);
  transition: transform 0.2s ease;
}

.l-bookmark-item__arrow-icon {
  display: block;
  transition: transform 0.2s ease;
}

.l-bookmark-item__arrow-icon--expanded {
  transform: rotate(90deg);
}

/* 暗色主题支持 */
.l-bookmark-bar--dark .l-bookmark-item {
  color: var(--l-bookmark-item-color-dark, #e0e0e0);
}

.l-bookmark-bar--dark .l-bookmark-item:hover,
.l-bookmark-bar--dark .l-bookmark-item--active {
  background-color: var(--l-bookmark-item-hover-bg-dark, #424242);
}

.l-bookmark-bar--dark .l-bookmark-item--selected {
  background-color: var(--l-bookmark-item-selected-bg-dark, #1565c0);
}

.l-bookmark-bar--dark .l-bookmark-separator {
  background-color: var(--l-bookmark-separator-color-dark, #424242);
}
</style>

