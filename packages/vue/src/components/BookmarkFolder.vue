<script setup lang="ts">
/**
 * 书签文件夹组件
 * 渲染文件夹及其子项
 */
import type { BookmarkFolderItem, BookmarkItem as BookmarkItemType } from '@ldesign/bookmark-core'
import { computed } from 'vue'
import { provideBookmarkFolderContext, useBookmarkContext, useBookmarkFolderContext } from '../composables/useBookmark'
import BookmarkItem from './BookmarkItem.vue'

/**
 * 组件属性
 */
interface Props {
  /** 文件夹数据 */
  folder: BookmarkFolderItem
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

// 注入上下文
const bookmarkContext = useBookmarkContext()
const parentFolderContext = useBookmarkFolderContext()

// 计算当前层级
const currentLevel = computed(() => parentFolderContext.level + 1)

// 提供子级上下文
provideBookmarkFolderContext({
  level: currentLevel.value,
  parentId: props.folder.id,
})

// 是否展开
const isExpanded = computed(() => bookmarkContext.isExpanded(props.folder.id))

// 子项列表
const children = computed(() => props.folder.children || [])

/**
 * 处理子项点击
 */
function handleItemClick(item: BookmarkItemType, event: MouseEvent): void {
  emit('click', item, event)
}

/**
 * 处理子项右键菜单
 */
function handleItemContextMenu(item: BookmarkItemType, event: MouseEvent): void {
  emit('contextmenu', item, event)
}
</script>

<template>
  <div class="l-bookmark-folder">
    <!-- 文件夹头部 -->
    <BookmarkItem
      :item="folder"
      :draggable="draggable"
      @click="handleItemClick"
      @contextmenu="handleItemContextMenu"
    >
      <template #icon="slotProps">
        <slot name="folder-icon" v-bind="slotProps" />
      </template>
      <template #title="slotProps">
        <slot name="folder-title" v-bind="slotProps" />
      </template>
      <template #arrow="slotProps">
        <slot name="folder-arrow" v-bind="slotProps" />
      </template>
    </BookmarkItem>

    <!-- 子项列表 -->
    <Transition name="l-bookmark-folder">
      <div v-if="isExpanded && children.length > 0" class="l-bookmark-folder__children">
        <template v-for="child in children" :key="'id' in child ? child.id : Math.random()">
          <!-- 递归渲染文件夹 -->
          <BookmarkFolder
            v-if="child.type === 'folder'"
            :folder="child as BookmarkFolderItem"
            :draggable="draggable"
            @click="handleItemClick"
            @contextmenu="handleItemContextMenu"
          >
            <template #folder-icon="slotProps">
              <slot name="folder-icon" v-bind="slotProps" />
            </template>
            <template #folder-title="slotProps">
              <slot name="folder-title" v-bind="slotProps" />
            </template>
            <template #item-icon="slotProps">
              <slot name="item-icon" v-bind="slotProps" />
            </template>
            <template #item-title="slotProps">
              <slot name="item-title" v-bind="slotProps" />
            </template>
          </BookmarkFolder>

          <!-- 渲染普通书签项 -->
          <BookmarkItem
            v-else
            :item="child"
            :draggable="draggable"
            @click="handleItemClick"
            @contextmenu="handleItemContextMenu"
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
    </Transition>
  </div>
</template>

<style>
.l-bookmark-folder__children {
  overflow: hidden;
}

.l-bookmark-folder-enter-active,
.l-bookmark-folder-leave-active {
  transition: all 0.2s ease;
}

.l-bookmark-folder-enter-from,
.l-bookmark-folder-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>

