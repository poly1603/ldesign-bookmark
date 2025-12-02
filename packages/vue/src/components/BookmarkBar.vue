<script setup lang="ts">
/**
 * 书签栏组件
 * 主要的书签容器组件
 */
import type { BookmarkFolderItem, BookmarkItem as BookmarkItemType } from '@ldesign/bookmark-core'
import { isFolder } from '@ldesign/bookmark-core'
import { computed, ref, toRef, watch } from 'vue'
import type { BookmarkMode, BookmarkTheme } from '../types'
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
}>()

// 创建书签存储
const store = useBookmarkStore({
  items: props.items,
  persistent: props.persistent,
  storageKey: props.storageKey,
  defaultSelectedId: props.defaultSelectedId,
  defaultExpandedIds: props.defaultExpandedIds,
})

// 监听 items 变化
watch(
  () => props.items,
  (newItems) => {
    if (newItems) {
      store.updateItems(newItems)
    }
  },
  { deep: true },
)

// 监听选中事件
store.on('select', (params) => {
  emit('select', params.item, params.event)
})

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
})
</script>

<template>
  <div
    class="l-bookmark-bar"
    :class="[
      `l-bookmark-bar--${mode}`,
      `l-bookmark-bar--${theme}`,
    ]"
  >
    <slot name="prepend" />

    <div class="l-bookmark-bar__content">
      <template v-for="item in store.items.value" :key="'id' in item ? item.id : Math.random()">
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
    </div>

    <slot name="append" />
  </div>
</template>

