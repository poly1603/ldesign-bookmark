<script setup lang="ts">
/**
 * 书签项组件
 * 渲染单个书签或文件夹
 */
import type { BookmarkItem as BookmarkItemType } from '@ldesign/bookmark-core'
import { isFolder } from '@ldesign/bookmark-core'
import { computed } from 'vue'
import { useBookmarkContext, useBookmarkFolderContext } from '../composables/useBookmark'

/**
 * 组件属性
 */
interface Props {
  /** 书签项数据 */
  item: BookmarkItemType
  /** 是否可拖拽 */
  draggable?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  draggable: true,
})

/**
 * 组件事件
 */
const emit = defineEmits<{
  /** 点击事件 */
  click: [item: BookmarkItemType, event: MouseEvent]
  /** 右键菜单事件 */
  contextmenu: [item: BookmarkItemType, event: MouseEvent]
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

// 状态
const isSelected = computed(() => itemId.value ? bookmarkContext.isSelected(itemId.value) : false)
const isActive = computed(() => itemId.value ? bookmarkContext.isActive(itemId.value) : false)
const isExpanded = computed(() => itemId.value ? bookmarkContext.isExpanded(itemId.value) : false)

// 层级缩进
const indent = computed(() => folderContext.level * 16)

/**
 * 处理点击
 */
function handleClick(event: MouseEvent): void {
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
  emit('contextmenu', props.item, event)
}

/**
 * 处理鼠标进入
 */
function handleMouseEnter(): void {
  if (itemId.value) {
    bookmarkContext.setActiveId(itemId.value)
  }
}

/**
 * 处理鼠标离开
 */
function handleMouseLeave(): void {
  bookmarkContext.setActiveId(null)
}

/**
 * 处理拖拽开始
 */
function handleDragStart(event: DragEvent): void {
  if (!props.draggable || !itemId.value) {
    event.preventDefault()
    return
  }
  event.dataTransfer?.setData('text/plain', itemId.value)
}
</script>

<template>
  <!-- 分隔线 -->
  <div
    v-if="isItemSeparator"
    class="l-bookmark-separator"
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
    }"
    :style="{ paddingLeft: `${indent}px` }"
    :draggable="draggable"
    @click="handleClick"
    @contextmenu="handleContextMenu"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
    @dragstart="handleDragStart"
  >
    <!-- 图标 -->
    <span v-if="itemIcon || isItemFolder" class="l-bookmark-item__icon">
      <slot name="icon" :item="item" :is-folder="isItemFolder" :is-expanded="isExpanded">
        {{ isItemFolder ? (isExpanded ? '📂' : '📁') : '🔖' }}
      </slot>
    </span>

    <!-- 标题 -->
    <span class="l-bookmark-item__title">
      <slot name="title" :item="item">
        {{ itemTitle }}
      </slot>
    </span>

    <!-- 展开箭头 -->
    <span v-if="isItemFolder" class="l-bookmark-item__arrow">
      <slot name="arrow" :is-expanded="isExpanded">
        {{ isExpanded ? '▼' : '▶' }}
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
  transition: background-color 0.2s;
  user-select: none;
}

.l-bookmark-item:hover,
.l-bookmark-item--active {
  background-color: var(--l-bookmark-item-hover-bg, #f5f5f5);
}

.l-bookmark-item--selected {
  background-color: var(--l-bookmark-item-selected-bg, #e3f2fd);
}

.l-bookmark-item__icon {
  flex-shrink: 0;
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.l-bookmark-item__title {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 14px;
  color: var(--l-bookmark-item-color, #333);
}

.l-bookmark-item__arrow {
  flex-shrink: 0;
  font-size: 10px;
  color: var(--l-bookmark-arrow-color, #999);
  transition: transform 0.2s;
}

.l-bookmark-item--expanded .l-bookmark-item__arrow {
  transform: rotate(0deg);
}
</style>

