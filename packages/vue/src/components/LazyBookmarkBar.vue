<script setup lang="ts">
/**
 * 懒加载书签栏组件
 * 支持异步加载和代码分割
 */
import { defineAsyncComponent, ref } from 'vue'
import type { BookmarkItem as BookmarkItemType } from '@ldesign/bookmark-core'
import type { BookmarkMode, BookmarkTheme } from '../types'

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
  select: [item: BookmarkItemType, event?: Event]
  add: [item: BookmarkItemType]
  remove: [id: string]
  update: [id: string, changes: Partial<BookmarkItemType>]
  contextmenu: [item: BookmarkItemType, event: MouseEvent]
}>()

// 异步加载 BookmarkBar 组件
const BookmarkBar = defineAsyncComponent({
  loader: () => import('./BookmarkBar.vue'),
  loadingComponent: {
    template: '<div class="l-bookmark-loading">加载中...</div>',
  },
  errorComponent: {
    template: '<div class="l-bookmark-error">加载失败</div>',
  },
  delay: 200,
  timeout: 3000,
})

const isLoaded = ref(false)

// 标记为已加载
function onComponentLoaded() {
  isLoaded.value = true
}
</script>

<template>
  <Suspense @resolve="onComponentLoaded">
    <BookmarkBar
      :items="items"
      :mode="mode"
      :theme="theme"
      :draggable="draggable"
      :show-icon="showIcon"
      :show-title="showTitle"
      :persistent="persistent"
      :storage-key="storageKey"
      :default-selected-id="defaultSelectedId"
      :default-expanded-ids="defaultExpandedIds"
      @select="emit('select', $event)"
      @add="emit('add', $event)"
      @remove="emit('remove', $event)"
      @update="emit('update', $event)"
      @contextmenu="emit('contextmenu', $event)"
    >
      <template v-for="(_, slot) in $slots" #[slot]="scope">
        <slot :name="slot" v-bind="scope" />
      </template>
    </BookmarkBar>

    <template #fallback>
      <div class="l-bookmark-loading">
        <div class="l-bookmark-loading__spinner" />
        <span>加载书签组件中...</span>
      </div>
    </template>
  </Suspense>
</template>

<style scoped>
.l-bookmark-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 24px;
  color: #666;
  font-size: 14px;
}

.l-bookmark-loading__spinner {
  width: 20px;
  height: 20px;
  border: 2px solid #e0e0e0;
  border-top-color: #1890ff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.l-bookmark-error {
  padding: 24px;
  color: #f5222d;
  text-align: center;
  font-size: 14px;
}
</style>