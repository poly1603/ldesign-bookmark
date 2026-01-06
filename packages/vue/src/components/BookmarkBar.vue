<script setup lang="ts">
/**
 * 书签栏组件
 * 主要的书签容器组件，支持键盘导航、加载状态和溢出菜单
 *
 * @example
 * ```vue
 * <BookmarkBar
 *   :items="bookmarks"
 *   mode="horizontal"
 *   theme="light"
 *   :keyboard-navigation="true"
 *   @select="handleSelect"
 * />
 * ```
 */
import type { BookmarkFolderItem, BookmarkItem as BookmarkItemType } from '@ldesign/bookmark-core'
import { isFolder, getItemId, flattenItems } from '@ldesign/bookmark-core'
import { computed, ref, toRef, watch, onMounted, onUnmounted, nextTick } from 'vue'
import type { BookmarkMode, BookmarkTheme, SizeVariant } from '../types'
import { provideBookmarkContext, provideBookmarkFolderContext } from '../composables/useBookmark'
import { useBookmarkStore } from '../composables/useBookmarkStore'
import BookmarkFolder from './BookmarkFolder.vue'
import BookmarkItem from './BookmarkItem.vue'

/**
 * 组件属性
 */
interface Props {
  /** 书签列表 */
  items?: BookmarkItemType[]
  /** 显示模式 */
  mode?: BookmarkMode
  /** 主题 */
  theme?: BookmarkTheme
  /** 是否可拖拽 */
  draggable?: boolean
  /** 是否显示图标 */
  showIcon?: boolean
  /** 是否显示标题 */
  showTitle?: boolean
  /** 是否持久化 */
  persistent?: boolean
  /** 存储键名 */
  storageKey?: string
  /** 默认选中的书签 ID */
  defaultSelectedId?: string
  /** 默认展开的文件夹 ID 列表 */
  defaultExpandedIds?: string[]
  /** 是否显示加载状态 */
  loading?: boolean
  /** 是否启用键盘导航 */
  keyboardNavigation?: boolean
  /** 大小变体 */
  size?: SizeVariant
  /** 最大可见项目数 */
  maxVisibleItems?: number
  /** 是否显示添加按钮 */
  showAddButton?: boolean
  /** 空状态文本 */
  emptyText?: string
}

const props = withDefaults(defineProps<Props>(), {
  items: () => [],
  mode: 'horizontal',
  theme: 'light',
  draggable: true,
  showIcon: true,
  showTitle: true,
  persistent: false,
  storageKey: 'ldesign-bookmarks',
  defaultSelectedId: undefined,
  defaultExpandedIds: () => [],
  loading: false,
  keyboardNavigation: true,
  size: 'medium',
  maxVisibleItems: undefined,
  showAddButton: false,
  emptyText: '暂无书签',
})

/**
 * 组件事件
 */
const emit = defineEmits<{
  /** 选中书签 */
  select: [item: BookmarkItemType, event?: Event]
  /** 添加书签 */
  add: [item: BookmarkItemType]
  /** 删除书签 */
  remove: [id: string]
  /** 更新书签 */
  update: [id: string, changes: Partial<BookmarkItemType>]
  /** 右键菜单 */
  contextmenu: [item: BookmarkItemType, event: MouseEvent]
  /** 点击添加按钮 */
  'add-click': []
  /** 点击更多按钮 */
  'more-click': [hiddenItems: BookmarkItemType[]]
}>()

// 组件引用
const containerRef = ref<HTMLElement | null>(null)
const contentRef = ref<HTMLElement | null>(null)

// 溢出状态
const showMoreMenu = ref(false)
const hiddenItems = ref<BookmarkItemType[]>([])

// 创建书签存储
const store = useBookmarkStore({
  items: props.items,
  persistent: props.persistent,
  storageKey: props.storageKey,
  defaultSelectedId: props.defaultSelectedId,
  defaultExpandedIds: props.defaultExpandedIds,
})

// 监听 items 变化（移除深度监听以提升性能）
watch(
  () => props.items,
  (newItems) => {
    if (newItems) {
      store.updateItems(newItems)
    }
  },
  { immediate: false },
)

// 监听选中事件
store.on('select', (params) => {
  emit('select', params.item, params.event)
})

// 计算可见和隐藏的项目
const visibleItems = computed(() => {
  if (!props.maxVisibleItems || props.maxVisibleItems >= store.items.value.length) {
    return store.items.value
  }
  return store.items.value.slice(0, props.maxVisibleItems)
})

const overflowItems = computed(() => {
  if (!props.maxVisibleItems || props.maxVisibleItems >= store.items.value.length) {
    return []
  }
  return store.items.value.slice(props.maxVisibleItems)
})

// 是否显示空状态
const isEmpty = computed(() => store.items.value.length === 0)

// 提供根级文件夹上下文
provideBookmarkFolderContext({
  level: 0,
  parentId: undefined,
})

// 提供书签上下文
provideBookmarkContext({
  items: store.items,
  mode: toRef(props, 'mode'),
  theme: toRef(props, 'theme'),
  state: store.state,
  draggable: toRef(props, 'draggable'),
  showIcon: toRef(props, 'showIcon'),
  showTitle: toRef(props, 'showTitle'),
  select: store.select,
  add: store.add,
  remove: store.remove,
  update: store.update,
  move: store.move,
  toggleExpand: store.toggleExpand,
  expand: store.expand,
  collapse: store.collapse,
  setActiveId: store.setActiveId,
  isExpanded: (id: string) => store.expandedIds.value.includes(id),
  isSelected: (id: string) => store.selectedId.value === id,
  isActive: (id: string) => store.activeId.value === id,
})

/**
 * 处理书签项点击
 */
function handleItemClick(item: BookmarkItemType, event: MouseEvent): void {
  // 事件已在 store 中处理
}

/**
 * 处理右键菜单
 */
function handleContextMenu(item: BookmarkItemType, event: MouseEvent): void {
  emit('contextmenu', item, event)
}

/**
 * 处理添加按钮点击
 */
function handleAddClick(): void {
  emit('add-click')
}

/**
 * 处理更多按钮点击
 */
function handleMoreClick(): void {
  showMoreMenu.value = !showMoreMenu.value
  emit('more-click', overflowItems.value)
}

// ==================== 键盘导航 ====================

// 当前聚焦索引
const focusIndex = ref(-1)

// 扁平化的可导航项目
const navigableItems = computed(() => {
  return flattenItems(visibleItems.value)
    .filter(item => item.item.type !== 'separator')
})

/**
 * 键盘事件处理
 */
function handleKeyDown(event: KeyboardEvent): void {
  if (!props.keyboardNavigation) return

  const { key } = event
  const itemCount = navigableItems.value.length

  if (itemCount === 0) return

  switch (key) {
    case 'ArrowRight':
    case 'ArrowDown':
      event.preventDefault()
      focusIndex.value = (focusIndex.value + 1) % itemCount
      focusCurrentItem()
      break

    case 'ArrowLeft':
    case 'ArrowUp':
      event.preventDefault()
      focusIndex.value = focusIndex.value <= 0 ? itemCount - 1 : focusIndex.value - 1
      focusCurrentItem()
      break

    case 'Home':
      event.preventDefault()
      focusIndex.value = 0
      focusCurrentItem()
      break

    case 'End':
      event.preventDefault()
      focusIndex.value = itemCount - 1
      focusCurrentItem()
      break

    case 'Enter':
    case ' ':
      event.preventDefault()
      if (focusIndex.value >= 0) {
        const item = navigableItems.value[focusIndex.value]
        if (item) {
          const id = getItemId(item.item)
          if (id) {
            if (isFolder(item.item)) {
              store.toggleExpand(id)
            } else {
              store.select(id, event)
            }
          }
        }
      }
      break

    case 'Escape':
      event.preventDefault()
      focusIndex.value = -1
      containerRef.value?.blur()
      break
  }
}

/**
 * 聚焦当前项目
 */
function focusCurrentItem(): void {
  nextTick(() => {
    if (focusIndex.value >= 0 && contentRef.value) {
      const items = contentRef.value.querySelectorAll('.l-bookmark-item, .l-bookmark-folder')
      const targetItem = items[focusIndex.value] as HTMLElement | undefined
      targetItem?.focus()
    }
  })
}

// 生命周期
onMounted(() => {
  if (props.keyboardNavigation && containerRef.value) {
    containerRef.value.addEventListener('keydown', handleKeyDown)
  }
})

onUnmounted(() => {
  if (containerRef.value) {
    containerRef.value.removeEventListener('keydown', handleKeyDown)
  }
})

/**
 * 搜索书签
 */
function searchBookmarks(query: string): BookmarkItemType[] {
  const results: BookmarkItemType[] = []
  const lowerQuery = query.toLowerCase()

  const search = (items: BookmarkItemType[]) => {
    for (const item of items) {
      if ('title' in item && item.title.toLowerCase().includes(lowerQuery)) {
        results.push(item)
      }
      if ('url' in item && item.url?.toLowerCase().includes(lowerQuery)) {
        if (!results.includes(item)) results.push(item)
      }
      if (isFolder(item)) {
        search(item.children)
      }
    }
  }

  search(store.items.value)
  return results
}

/**
 * 获取统计信息
 */
function getStats(): { total: number, bookmarks: number, folders: number } {
  let bookmarks = 0
  let folders = 0

  const count = (items: BookmarkItemType[]) => {
    for (const item of items) {
      if (isFolder(item)) {
        folders++
        count(item.children)
      } else if (item.type !== 'separator') {
        bookmarks++
      }
    }
  }

  count(store.items.value)
  return { total: bookmarks + folders, bookmarks, folders }
}

// 暴露方法给父组件
defineExpose({
  /** 添加书签 */
  add: store.add,
  /** 删除书签 */
  remove: store.remove,
  /** 更新书签 */
  update: store.update,
  /** 移动书签 */
  move: store.move,
  /** 展开所有 */
  expandAll: store.expandAll,
  /** 收起所有 */
  collapseAll: store.collapseAll,
  /** 保存到存储 */
  save: store.save,
  /** 从存储加载 */
  load: store.load,
  /** 获取书签列表 */
  getItems: () => store.items.value,
  /** 获取选中的书签 ID */
  getSelectedId: () => store.selectedId.value,
  /** 搜索书签 */
  search: searchBookmarks,
  /** 获取统计信息 */
  getStats,
})
</script>

<template>
  <div
    ref="containerRef"
    class="l-bookmark-bar"
    :class="[
      `l-bookmark-bar--${mode}`,
      `l-bookmark-bar--${theme}`,
      `l-bookmark-bar--${size}`,
      {
        'l-bookmark-bar--loading': loading,
        'l-bookmark-bar--empty': isEmpty,
      },
    ]"
    :tabindex="keyboardNavigation ? 0 : -1"
    role="toolbar"
    :aria-label="'书签栏'"
  >
    <!-- 加载状态 -->
    <div v-if="loading" class="l-bookmark-bar__loading">
      <slot name="loading">
        <span class="l-bookmark-bar__spinner" />
      </slot>
    </div>

    <!-- 前置插槽 -->
    <slot name="prepend" />

    <!-- 主内容 -->
    <div ref="contentRef" class="l-bookmark-bar__content">
      <!-- 空状态 -->
      <div v-if="isEmpty && !loading" class="l-bookmark-bar__empty">
        <slot name="empty">
          <span class="l-bookmark-bar__empty-text">{{ emptyText }}</span>
        </slot>
      </div>

      <!-- 书签列表 -->
      <template v-else v-for="item in visibleItems" :key="'id' in item ? item.id : Math.random()">
        <!-- 文件夹 -->
        <BookmarkFolder
          v-if="isFolder(item)"
          :folder="item as BookmarkFolderItem"
          :draggable="draggable"
          @click="handleItemClick"
          @contextmenu="handleContextMenu"
        >
          <template #folder-icon="slotProps">
            <slot name="folder-icon" v-bind="slotProps" />
          </template>
          <template #item-icon="slotProps">
            <slot name="item-icon" v-bind="slotProps" />
          </template>
        </BookmarkFolder>

        <!-- 普通书签 -->
        <BookmarkItem
          v-else
          :item="item"
          :draggable="draggable"
          @click="handleItemClick"
          @contextmenu="handleContextMenu"
        >
          <template #icon="slotProps">
            <slot name="item-icon" v-bind="slotProps" />
          </template>
          <template #title="slotProps">
            <slot name="item-title" v-bind="slotProps" />
          </template>
        </BookmarkItem>
      </template>

      <!-- 溢出菜单按钮 -->
      <button
        v-if="overflowItems.length > 0"
        class="l-bookmark-bar__more-btn"
        :aria-label="`还有 ${overflowItems.length} 个书签`"
        @click="handleMoreClick"
      >
        <slot name="more-icon">
          <span class="l-bookmark-bar__more-icon">»</span>
        </slot>
        <span class="l-bookmark-bar__more-count">{{ overflowItems.length }}</span>
      </button>
    </div>

    <!-- 添加按钮 -->
    <button
      v-if="showAddButton"
      class="l-bookmark-bar__add-btn"
      aria-label="添加书签"
      @click="handleAddClick"
    >
      <slot name="add-icon">
        <span class="l-bookmark-bar__add-icon">+</span>
      </slot>
    </button>

    <!-- 后置插槽 -->
    <slot name="append" />

    <!-- 溢出菜单 -->
    <Teleport to="body">
      <div
        v-if="showMoreMenu && overflowItems.length > 0"
        class="l-bookmark-bar__overflow-menu"
        @click.self="showMoreMenu = false"
      >
        <div class="l-bookmark-bar__overflow-content">
          <template v-for="item in overflowItems" :key="'id' in item ? item.id : Math.random()">
            <BookmarkFolder
              v-if="isFolder(item)"
              :folder="item as BookmarkFolderItem"
              :draggable="false"
              @click="handleItemClick"
              @contextmenu="handleContextMenu"
            />
            <BookmarkItem
              v-else
              :item="item"
              :draggable="false"
              @click="handleItemClick"
              @contextmenu="handleContextMenu"
            />
          </template>
        </div>
      </div>
    </Teleport>
  </div>
</template>

