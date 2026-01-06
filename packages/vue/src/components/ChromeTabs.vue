<script setup lang="ts">
/**
 * Chrome 风格标签页组件
 *
 * 基于 CSS mask 遮罩实现 Chrome 浏览器标签页效果
 * 参考: https://juejin.cn/post/6986827061461516324
 *       https://codepen.io/xboxyan/pen/NWjjBvX
 *
 * 特性:
 * - 使用 SVG mask 实现圆角效果
 * - 支持右键菜单、锁定、刷新
 * - 标签激活状态明显区分
 * - 支持多种样式变体
 * - 支持添加/关闭动画
 *
 * @example
 * ```vue
 * <ChromeTabs
 *   :tabs="tabs"
 *   :active-key="activeTab"
 *   variant="chrome"
 *   @change="handleChange"
 *   @close="handleClose"
 * />
 * ```
 */
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import {
  ArrowLeft,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Home,
  Lock,
  MoreVertical,
  Pin,
  Plus,
  RotateCw,
  Unlock,
  X,
  XCircle,
} from 'lucide-vue-next'
import type { ChromeTabContextAction, ChromeTabItem, ChromeTabVariant } from '../types'

// 拖拽状态
interface DragState {
  dragging: boolean
  dragIndex: number
  dropIndex: number
  dragItem: ChromeTabItem | null
}

interface Props {
  /** 标签列表 */
  tabs?: ChromeTabItem[]
  /** 当前激活的标签 key */
  activeKey?: string
  /** 标签栏高度 @default 44 */
  height?: number
  /** 是否显示添加按钮 @default false */
  showAdd?: boolean
  /** 是否显示更多操作按钮 @default false */
  showMore?: boolean
  /** 样式变体 @default 'chrome' */
  variant?: ChromeTabVariant
  /** 最大标签数量 @default 20 */
  maxTabs?: number
  /** 是否显示标签图标 @default true */
  showIcon?: boolean
  /** 自定义类名 */
  class?: string
  /** 是否启用拖拽排序 @default true */
  draggable?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  tabs: () => [],
  height: 44,
  showAdd: false,
  showMore: false,
  variant: 'chrome',
  maxTabs: 20,
  showIcon: true,
  draggable: true,
})

const emit = defineEmits<{
  (e: 'change', key: string): void
  (e: 'close', key: string): void
  (e: 'add'): void
  (e: 'contextAction', action: ChromeTabContextAction, tab: ChromeTabItem, index: number): void
  (e: 'togglePin', key: string): void
  (e: 'refresh', key: string): void
  (e: 'closeLeft', key: string): void
  (e: 'closeRight', key: string): void
  (e: 'closeOthers', key: string): void
  (e: 'closeAll'): void
  (e: 'sort', fromIndex: number, toIndex: number, newTabs: ChromeTabItem[]): void
  (e: 'update:tabs', tabs: ChromeTabItem[]): void
}>()

/** 滚动容器引用 */
const scrollRef = ref<HTMLElement | null>(null)
/** 当前激活标签元素引用 */
const activeTabRef = ref<HTMLElement | null>(null)
/** 是否可以向左滚动 */
const canScrollLeft = ref(false)
/** 是否可以向右滚动 */
const canScrollRight = ref(false)
/** 右键菜单状态 */
const contextMenu = ref({
  visible: false,
  x: 0,
  y: 0,
  tab: null as ChromeTabItem | null,
  index: -1,
})

/** 拖拽状态 */
const dragState = ref<DragState>({
  dragging: false,
  dragIndex: -1,
  dropIndex: -1,
  dragItem: null,
})

/** 滚动步长 */
const SCROLL_STEP = 200

/** 标签栏类名 */
const tabsClass = computed(() => [
  'l-chrome-tabs',
  `l-chrome-tabs--${props.variant}`,
  props.class,
])

/** 判断标签是否激活 */
const isActive = (key: string) => key === props.activeKey

/** 可显示的标签（受最大数量限制） */
const displayTabs = computed(() => {
  if (props.tabs.length <= props.maxTabs) {
    return props.tabs
  }
  const pinnedTabs = props.tabs.filter(t => t.pinned || t.isHome)
  const normalTabs = props.tabs.filter(t => !t.pinned && !t.isHome)
  const remaining = props.maxTabs - pinnedTabs.length
  return [...pinnedTabs, ...normalTabs.slice(-remaining)]
})

/** 获取右键菜单选项 */
const contextMenuItems = computed(() => {
  const { tab, index } = contextMenu.value
  if (!tab) return []

  const items: Array<{ value: ChromeTabContextAction, label: string, icon: typeof RotateCw, disabled?: boolean }> = []

  if (tab.key === props.activeKey) {
    items.push({ value: 'refresh', label: '刷新', icon: RotateCw })
  }

  if (!tab.isHome) {
    items.push({
      value: tab.pinned ? 'unlock' : 'lock',
      label: tab.pinned ? '解锁' : '锁定',
      icon: tab.pinned ? Unlock : Lock,
    })
  }

  if (index > 0) {
    items.push({ value: 'close-left', label: '关闭左侧', icon: ArrowLeft })
  }

  if (index < props.tabs.length - 1) {
    items.push({ value: 'close-right', label: '关闭右侧', icon: ArrowRight })
  }

  items.push({ value: 'close-other', label: '关闭其他', icon: XCircle })

  return items
})

/** 更新滚动箭头状态 */
function updateScrollArrows(): void {
  const el = scrollRef.value
  if (!el) return
  canScrollLeft.value = el.scrollLeft > 0
  canScrollRight.value = el.scrollLeft + el.clientWidth < el.scrollWidth - 1
}

/** 向左滚动 */
function scrollLeft(): void {
  const el = scrollRef.value
  if (!el) return
  el.scrollTo({ left: Math.max(0, el.scrollLeft - SCROLL_STEP), behavior: 'smooth' })
}

/** 向右滚动 */
function scrollRight(): void {
  const el = scrollRef.value
  if (!el) return
  el.scrollTo({ left: el.scrollLeft + SCROLL_STEP, behavior: 'smooth' })
}

/** 滚动到当前激活标签 */
function scrollToActiveTab(): void {
  if (!scrollRef.value || !activeTabRef.value) return
  const container = scrollRef.value
  const tab = activeTabRef.value
  const containerRect = container.getBoundingClientRect()
  const tabRect = tab.getBoundingClientRect()
  const targetLeft = tab.offsetLeft - containerRect.width / 2 + tabRect.width / 2
  container.scrollTo({ left: Math.max(0, targetLeft), behavior: 'smooth' })
}

/** 处理标签点击 */
function handleTabClick(tab: ChromeTabItem): void {
  emit('change', tab.key)
}

/** 处理标签关闭 */
function handleTabClose(event: MouseEvent, tab: ChromeTabItem): void {
  event.stopPropagation()
  if (tab.closable !== false && !tab.pinned) {
    emit('close', tab.key)
  }
}

/** 显示右键菜单 */
function showContextMenu(event: MouseEvent, tab: ChromeTabItem, index: number): void {
  event.preventDefault()
  contextMenu.value = { visible: true, x: event.clientX, y: event.clientY, tab, index }
}

/** 隐藏右键菜单 */
function hideContextMenu(): void {
  contextMenu.value.visible = false
}

/** 处理右键菜单点击 */
function handleContextMenuClick(action: ChromeTabContextAction): void {
  const { tab, index } = contextMenu.value
  if (!tab) return
  emit('contextAction', action, tab, index)
  switch (action) {
    case 'refresh': emit('refresh', tab.key); break
    case 'lock': case 'unlock': emit('togglePin', tab.key); break
    case 'close-left': emit('closeLeft', tab.key); break
    case 'close-right': emit('closeRight', tab.key); break
    case 'close-other': emit('closeOthers', tab.key); break
    case 'close-all': emit('closeAll'); break
  }
  hideContextMenu()
}

/** 处理添加 */
function handleAdd(): void { emit('add') }

/** 处理滚动事件 */
function handleScroll(): void { updateScrollArrows() }

/** 点击外部关闭菜单 */
function handleClickOutside(event: MouseEvent): void {
  const target = event.target as HTMLElement
  if (!target.closest('.l-chrome-tabs__context-menu')) {
    hideContextMenu()
  }
}

// ==================== 拖拽排序 ====================

/** 根据 displayTabs 索引找到 props.tabs 中的真实索引 */
function getRealIndex(displayIndex: number): number {
  const tab = displayTabs.value[displayIndex]
  if (!tab) return -1
  return props.tabs.findIndex(t => t.key === tab.key)
}

/** 开始拖拽 */
function handleDragStart(event: DragEvent, tab: ChromeTabItem, index: number): void {
  // 只有非固定、非首页的标签可以拖拽
  if (!props.draggable || tab.pinned || tab.isHome) {
    event.preventDefault()
    return
  }
  
  dragState.value = {
    dragging: true,
    dragIndex: index,
    dropIndex: index,
    dragItem: tab,
  }
  
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', tab.key)
  }
}

/** 拖拽过程中 */
function handleDragOver(event: DragEvent, index: number): void {
  if (!dragState.value.dragging) return
  event.preventDefault()
  
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move'
  }
  
  // 更新目标位置
  if (dragState.value.dropIndex !== index) {
    dragState.value.dropIndex = index
  }
}

/** 进入拖拽目标 */
function handleDragEnter(event: DragEvent, index: number): void {
  if (!dragState.value.dragging) return
  event.preventDefault()
  dragState.value.dropIndex = index
}

/** 离开拖拽目标 */
function handleDragLeave(): void {
  // 保持 dropIndex 不变，等待 drop 或 dragend
}

/** 放置 */
function handleDrop(event: DragEvent, index: number): void {
  event.preventDefault()
  
  const { dragIndex, dragItem } = dragState.value
  
  if (dragIndex !== -1 && dragIndex !== index && dragItem) {
    // 找到在 props.tabs 中的真实索引
    const realFromIndex = getRealIndex(dragIndex)
    const realToIndex = getRealIndex(index)
    
    if (realFromIndex !== -1 && realToIndex !== -1 && realFromIndex !== realToIndex) {
      // 创建新的标签数组
      const newTabs = [...props.tabs]
      const [movedTab] = newTabs.splice(realFromIndex, 1)
      // 如果拖拽到后面，需要调整目标索引
      const adjustedToIndex = realFromIndex < realToIndex ? realToIndex : realToIndex
      newTabs.splice(adjustedToIndex, 0, movedTab)
      
      // 发出排序事件（包含新数组）
      emit('sort', realFromIndex, adjustedToIndex, newTabs)
      // 支持 v-model:tabs
      emit('update:tabs', newTabs)
    }
  }
  
  // 重置拖拽状态
  resetDragState()
}

/** 结束拖拽 */
function handleDragEnd(): void {
  resetDragState()
}

/** 重置拖拽状态 */
function resetDragState(): void {
  dragState.value = {
    dragging: false,
    dragIndex: -1,
    dropIndex: -1,
    dragItem: null,
  }
}

watch(() => props.activeKey, () => { nextTick(() => { scrollToActiveTab() }) })
watch(() => props.tabs.length, () => { nextTick(() => { updateScrollArrows() }) })

onMounted(() => {
  nextTick(() => { updateScrollArrows(); scrollToActiveTab() })
  document.addEventListener('click', handleClickOutside)
  scrollRef.value?.addEventListener('scroll', handleScroll)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  scrollRef.value?.removeEventListener('scroll', handleScroll)
})
</script>

<template>
  <div :class="tabsClass" :style="{ height: `${height}px` }">
    <!-- 左滚动按钮 -->
    <Transition name="fade">
      <button v-if="canScrollLeft" class="l-chrome-tabs__scroll-btn l-chrome-tabs__scroll-btn--left" type="button"
        @click="scrollLeft">
        <ChevronLeft :size="16" />
      </button>
    </Transition>

    <!-- 标签列表容器 -->
    <div ref="scrollRef" class="l-chrome-tabs__scroll">
      <TransitionGroup name="tab" tag="div" class="l-chrome-tabs__list">
        <div v-for="(tab, index) in displayTabs" :key="tab.key"
          :ref="el => { if (isActive(tab.key)) activeTabRef = el as HTMLElement }"
          :class="[
            'l-chrome-tabs__item',
            {
              'l-chrome-tabs__item--active': isActive(tab.key),
              'l-chrome-tabs__item--pinned': tab.pinned,
              'l-chrome-tabs__item--home': tab.isHome,
              'l-chrome-tabs__item--dragging': dragState.dragging && dragState.dragIndex === index,
              'l-chrome-tabs__item--drop-target': dragState.dragging && dragState.dropIndex === index && dragState.dragIndex !== index,
            }
          ]"
          :draggable="props.draggable && !tab.pinned && !tab.isHome"
          @click="handleTabClick(tab)"
          @contextmenu="showContextMenu($event, tab, index)"
          @dragstart="handleDragStart($event, tab, index)"
          @dragover="handleDragOver($event, index)"
          @dragenter="handleDragEnter($event, index)"
          @dragleave="handleDragLeave"
          @drop="handleDrop($event, index)"
          @dragend="handleDragEnd">
          <div class="l-chrome-tabs__item-wrap">
            <span v-if="(showIcon && tab.icon) || tab.isHome" class="l-chrome-tabs__icon">
              <slot name="icon" :tab="tab">
                <Home v-if="tab.isHome" :size="14" />
                <span v-else>{{ tab.icon }}</span>
              </slot>
            </span>
            <span class="l-chrome-tabs__title">{{ tab.title }}</span>
            <span v-if="tab.pinned && !tab.isHome" class="l-chrome-tabs__lock">
              <Pin :size="12" />
            </span>
            <button v-else-if="tab.closable !== false && !tab.pinned && !tab.isHome" class="l-chrome-tabs__close"
              type="button" @click="handleTabClose($event, tab)">
              <X :size="14" />
            </button>
          </div>
        </div>
      </TransitionGroup>
    </div>

    <!-- 右滚动按钮 -->
    <Transition name="fade">
      <button v-if="canScrollRight" class="l-chrome-tabs__scroll-btn l-chrome-tabs__scroll-btn--right" type="button"
        @click="scrollRight">
        <ChevronRight :size="16" />
      </button>
    </Transition>

    <!-- 添加按钮 -->
    <button v-if="showAdd" class="l-chrome-tabs__add" type="button" @click="handleAdd">
      <Plus :size="16" />
    </button>

    <!-- 更多操作 -->
    <div v-if="showMore" class="l-chrome-tabs__more">
      <slot name="more"><button class="l-chrome-tabs__more-btn" type="button">
          <MoreVertical :size="16" />
        </button></slot>
    </div>

    <!-- 右键菜单 -->
    <Teleport to="body">
      <Transition name="context-menu">
        <div v-if="contextMenu.visible" class="l-chrome-tabs__context-menu"
          :style="{ left: `${contextMenu.x}px`, top: `${contextMenu.y}px` }">
          <div v-for="item in contextMenuItems" :key="item.value" class="l-chrome-tabs__context-item"
            :class="{ 'l-chrome-tabs__context-item--disabled': item.disabled }"
            @click="!item.disabled && handleContextMenuClick(item.value)">
            <component :is="item.icon" :size="14" class="l-chrome-tabs__context-icon" />
            <span class="l-chrome-tabs__context-label">{{ item.label }}</span>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
/* ==================== CSS 变量定义 ==================== */
.l-chrome-tabs {
  /* 颜色 - 浅灰背景，选中白色 */
  --tabs-bg: var(--color-gray-100, #f3f4f6);
  --tabs-item-bg: transparent;
  --tabs-item-bg-hover: var(--color-gray-200, #e5e7eb);
  --tabs-item-bg-active: var(--color-bg-container, #ffffff);
  --tabs-text-color: var(--color-gray-500, #6b7280);
  --tabs-text-color-active: var(--color-gray-800, #1f2937);
  --tabs-text-color-secondary: var(--color-gray-400, #9ca3af);
  --tabs-border-color: var(--color-gray-200, #e5e7eb);
  
  /* 尺寸 - 使用 @ldesign/size 变量 */
  --tabs-font-size: var(--size-font-sm, 13px);
  --tabs-item-padding: var(--size-space-xs, 8px) var(--size-space-xl, 30px);
  --tabs-icon-size: var(--size-icon-xs, 16px);
  --tabs-btn-size: var(--size-8, 28px);
  --tabs-radius: var(--size-radius-sm, 6px);
  --tabs-radius-lg: var(--size-radius-md, 8px);
  
  /* 动画 */
  --tabs-transition: all var(--size-duration-fast, 150ms) cubic-bezier(0.4, 0, 0.2, 1);
  --tabs-shadow: var(--size-shadow-2, 0 1px 3px rgba(0, 0, 0, 0.08));
  --tabs-shadow-lg: var(--size-shadow-4, 0 4px 12px rgba(0, 0, 0, 0.12));
}

/* ==================== 基础容器 ==================== */
.l-chrome-tabs {
  display: flex;
  align-items: flex-end;
  background-color: var(--tabs-bg);
  padding: var(--size-space-xxs, 6px) 0 0 0;
  gap: 0;
  user-select: none;
  box-sizing: border-box;
  font-size: var(--tabs-font-size);
}

/* ==================== 滚动容器 ==================== */
.l-chrome-tabs__scroll {
  flex: 1;
  overflow-x: auto;
  overflow-y: hidden;
  scroll-behavior: smooth;
  scrollbar-width: none;
  -ms-overflow-style: none;
  height: 100%;
}

.l-chrome-tabs__scroll::-webkit-scrollbar {
  display: none;
}

/* ==================== 滚动按钮 ==================== */
.l-chrome-tabs__scroll-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: var(--tabs-btn-size);
  height: var(--tabs-btn-size);
  padding: 0;
  background: var(--color-gray-100, rgba(0, 0, 0, 0.05));
  border: none;
  border-radius: var(--tabs-radius);
  cursor: pointer;
  transition: var(--tabs-transition);
  flex-shrink: 0;
  color: var(--tabs-text-color);
  margin-bottom: var(--size-space-xxs, 4px);
}

.l-chrome-tabs__scroll-btn:hover {
  background: var(--color-gray-200, rgba(0, 0, 0, 0.1));
  color: var(--tabs-text-color-active);
}

.l-chrome-tabs__scroll-btn--left {
  margin-right: var(--size-space-xxs, 4px);
}

.l-chrome-tabs__scroll-btn--right {
  margin-left: var(--size-space-xxs, 4px);
}

/* ==================== 标签列表 ==================== */
.l-chrome-tabs__list {
  display: flex;
  align-items: flex-end;
  height: 100%;
  padding: 0;
  gap: 0;
  position: relative;
}

/* ==================== 标签项 - Chrome 风格核心 ==================== */
.l-chrome-tabs__item {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 80px;
  max-width: 200px;
  cursor: pointer;
  white-space: nowrap;
  padding: var(--tabs-item-padding);
  margin: 0 -15px;
  color: var(--tabs-text-color);
  transition: var(--tabs-transition);
  box-sizing: border-box;
  flex-shrink: 0;
  font-weight: 400;
  /* Chrome 风格圆角遮罩 - 两侧都有凹陷 */
  -webkit-mask-box-image: url("data:image/svg+xml,%3Csvg width='67' height='33' viewBox='0 0 67 33' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath fill-rule='evenodd' clip-rule='evenodd' d='M27 0c-6.627 0-12 5.373-12 12v6c0 8.284-6.716 15-15 15h67c-8.284 0-15-6.716-15-15v-6c0-6.627-5.373-12-12-12H27z' fill='%23000'/%3E%3C/svg%3E") 12 27 15;
}

/* 第一个标签 - 左下角普通圆角，右下角凹陷 */
.l-chrome-tabs__item:first-child {
  margin-left: 0;
  -webkit-mask-box-image: url("data:image/svg+xml,%3Csvg width='67' height='33' viewBox='0 0 67 33' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath fill-rule='evenodd' clip-rule='evenodd' d='M12 0C5.373 0 0 5.373 0 12v9c0 6.627 5.373 12 12 12h55c-8.284 0-15-6.716-15-15v-6c0-6.627-5.373-12-12-12H12z' fill='%23000'/%3E%3C/svg%3E") 12 27 15;
}

/* 最后一个标签 - 左下角凹陷，右下角普通圆角 */
.l-chrome-tabs__item:last-child {
  margin-right: 0;
  -webkit-mask-box-image: url("data:image/svg+xml,%3Csvg width='67' height='33' viewBox='0 0 67 33' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath fill-rule='evenodd' clip-rule='evenodd' d='M27 0c-6.627 0-12 5.373-12 12v6c0 8.284-6.716 15-15 15h43c6.627 0 12-5.373 12-12v-9c0-6.627-5.373-12-12-12H27z' fill='%23000'/%3E%3C/svg%3E") 12 27 15;
}

/* 唯一标签 - 两边都是普通圆角 */
.l-chrome-tabs__item:first-child:last-child {
  -webkit-mask-box-image: url("data:image/svg+xml,%3Csvg width='67' height='33' viewBox='0 0 67 33' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Crect x='0' y='0' width='67' height='33' rx='12' fill='%23000'/%3E%3C/svg%3E") 12 12 12;
}

/* Chrome 变体样式 */
.l-chrome-tabs--chrome .l-chrome-tabs__item {
  background: var(--tabs-item-bg);
}

.l-chrome-tabs--chrome .l-chrome-tabs__item:hover {
  background: var(--tabs-item-bg-hover);
}

.l-chrome-tabs--chrome .l-chrome-tabs__item--active {
  background: var(--tabs-item-bg-active);
  z-index: 1;
  color: var(--tabs-text-color-active);
  font-weight: 500;
}

.l-chrome-tabs--chrome .l-chrome-tabs__item--active:hover {
  background: var(--tabs-item-bg-active);
}

/* 拖拽状态 - 被拖拽的标签 */
.l-chrome-tabs__item--dragging {
  opacity: 0.3;
  cursor: grabbing;
  transform: scale(0.95);
}

/* 拖拽放置指示器 - 使用 box-shadow 和 outline 避免被 mask 裁剪 */
.l-chrome-tabs__item--drop-target {
  position: relative;
  /* 使用内部阴影作为指示器 */
  box-shadow: inset 4px 0 0 0 var(--color-primary-500, #3b82f6);
}

/* 指示器高亮背景 */
.l-chrome-tabs__item--drop-target .l-chrome-tabs__item-wrap {
  background: rgba(59, 130, 246, 0.1);
  border-radius: 4px;
}

/* ==================== 标签内容 ==================== */
.l-chrome-tabs__item-wrap {
  display: flex;
  align-items: center;
  gap: var(--size-space-xxs, 6px);
  max-width: 100%;
  overflow: hidden;
}

.l-chrome-tabs__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: var(--tabs-icon-size);
  height: var(--tabs-icon-size);
  color: var(--color-primary-500, #3b82f6);
}

.l-chrome-tabs__title {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: var(--tabs-font-size);
}

.l-chrome-tabs__lock {
  display: flex;
  align-items: center;
  color: var(--tabs-text-color-secondary);
  flex-shrink: 0;
}

.l-chrome-tabs__close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  padding: 0;
  background: transparent;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  color: var(--tabs-text-color);
  opacity: 0;
  transition: var(--tabs-transition);
  flex-shrink: 0;
}

.l-chrome-tabs__item:hover .l-chrome-tabs__close {
  opacity: 1;
}

.l-chrome-tabs__close:hover {
  background: var(--color-danger-100, rgba(239, 68, 68, 0.15));
  color: var(--color-danger-500, #ef4444);
}

/* ==================== 添加/更多按钮 ==================== */
.l-chrome-tabs__add,
.l-chrome-tabs__more-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: var(--tabs-btn-size);
  height: var(--tabs-btn-size);
  padding: 0;
  background: transparent;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  color: var(--tabs-text-color);
  margin-bottom: var(--size-space-xxs, 4px);
  transition: var(--tabs-transition);
}

.l-chrome-tabs__add:hover,
.l-chrome-tabs__more-btn:hover {
  background: var(--color-gray-200, rgba(0, 0, 0, 0.08));
  color: var(--tabs-text-color-active);
}

/* ==================== 右键菜单 ==================== */
.l-chrome-tabs__context-menu {
  position: fixed;
  min-width: 180px;
  padding: var(--size-space-xxs, 4px);
  background: var(--color-bg-container, #ffffff);
  border: 1px solid var(--color-gray-200, #e5e7eb);
  border-radius: var(--tabs-radius-lg);
  box-shadow: var(--tabs-shadow-lg);
  z-index: var(--size-z-dropdown, 9999);
}

.l-chrome-tabs__context-item {
  display: flex;
  align-items: center;
  gap: var(--size-space-s, 10px);
  padding: var(--size-space-xs, 8px) var(--size-space-m, 14px);
  cursor: pointer;
  color: var(--color-gray-700, #374151);
  font-size: var(--tabs-font-size);
  border-radius: var(--tabs-radius);
  transition: var(--tabs-transition);
}

.l-chrome-tabs__context-item:hover {
  background: var(--color-gray-50, rgba(0, 0, 0, 0.04));
  color: var(--color-primary-500, #3b82f6);
}

.l-chrome-tabs__context-item--disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.l-chrome-tabs__context-icon {
  color: var(--color-gray-400, #9ca3af);
  flex-shrink: 0;
}

/* ==================== 动画效果 ==================== */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* 新增动画 - 更自然的缩放效果 */
.tab-enter-active {
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.tab-leave-active {
  transition: all 0.25s cubic-bezier(0.4, 0, 0.6, 1);
  position: absolute;
}

.tab-enter-from {
  opacity: 0;
  transform: scale(0.8) translateY(-10px);
}

.tab-leave-to {
  opacity: 0;
  transform: scale(0.8) translateY(10px);
}

/* 移动动画 - 排序时的平滑过渡 */
.tab-move {
  transition: transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
}

.context-menu-enter-active {
  transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
}

.context-menu-leave-active {
  transition: all 0.1s cubic-bezier(0.4, 0, 0.2, 1);
}

.context-menu-enter-from,
.context-menu-leave-to {
  opacity: 0;
  transform: scale(0.96);
}

/* ==================== 其他变体样式 ==================== */
/* 卡片风格 */
.l-chrome-tabs--card .l-chrome-tabs__item {
  background: var(--color-gray-100, #f3f4f6);
  border-radius: var(--tabs-radius) var(--tabs-radius) 0 0;
  margin: 0 var(--size-space-xxs, 2px);
  -webkit-mask-box-image: none;
}

.l-chrome-tabs--card .l-chrome-tabs__item:hover {
  background: var(--color-gray-50, #f9fafb);
}

.l-chrome-tabs--card .l-chrome-tabs__item--active {
  background: var(--color-bg-container, #ffffff);
}

/* 线条风格 */
.l-chrome-tabs--line .l-chrome-tabs__item {
  border-bottom: 2px solid transparent;
  border-radius: 0;
  margin: 0;
  padding: 0 var(--size-space-m, 16px);
  -webkit-mask-box-image: none;
  background: transparent;
}

.l-chrome-tabs--line .l-chrome-tabs__item:hover {
  background: var(--color-gray-50, rgba(0, 0, 0, 0.04));
}

.l-chrome-tabs--line .l-chrome-tabs__item--active {
  border-bottom-color: var(--color-primary-500, #3b82f6);
  color: var(--color-primary-500, #3b82f6);
  background: transparent;
}

/* 圆角药丸风格 */
.l-chrome-tabs--rounded .l-chrome-tabs__item {
  background: var(--color-gray-100, #f3f4f6);
  border-radius: var(--size-radius-full, 20px);
  margin: 0 var(--size-space-xxs, 4px);
  -webkit-mask-box-image: none;
}

.l-chrome-tabs--rounded .l-chrome-tabs__item:hover {
  background: var(--color-gray-200, #e5e7eb);
}

.l-chrome-tabs--rounded .l-chrome-tabs__item--active {
  background: var(--color-bg-container, #ffffff);
  box-shadow: var(--tabs-shadow);
}

/* ==================== 暗色模式 ==================== */
[data-theme-mode="dark"] .l-chrome-tabs,
[data-theme="dark"] .l-chrome-tabs,
.dark .l-chrome-tabs {
  --tabs-bg: var(--color-gray-800, #1f2937);
  --tabs-item-bg: transparent;
  --tabs-item-bg-hover: var(--color-gray-700, #374151);
  --tabs-item-bg-active: var(--color-gray-900, #111827);
  --tabs-text-color: var(--color-gray-300, #d1d5db);
  --tabs-text-color-active: var(--color-gray-50, #f9fafb);
  --tabs-text-color-secondary: var(--color-gray-500, #6b7280);
  --tabs-shadow-lg: 0 4px 12px rgba(0, 0, 0, 0.4);
}

[data-theme-mode="dark"] .l-chrome-tabs__context-menu,
[data-theme="dark"] .l-chrome-tabs__context-menu,
.dark .l-chrome-tabs__context-menu {
  background: var(--color-gray-800, #1f2937);
  border-color: var(--color-gray-700, #374151);
}

[data-theme-mode="dark"] .l-chrome-tabs__context-item,
[data-theme="dark"] .l-chrome-tabs__context-item,
.dark .l-chrome-tabs__context-item {
  color: var(--color-gray-200, #e5e7eb);
}

[data-theme-mode="dark"] .l-chrome-tabs__context-item:hover,
[data-theme="dark"] .l-chrome-tabs__context-item:hover,
.dark .l-chrome-tabs__context-item:hover {
  background: var(--color-gray-700, #374151);
}

[data-theme-mode="dark"] .l-chrome-tabs__close:hover,
[data-theme="dark"] .l-chrome-tabs__close:hover,
.dark .l-chrome-tabs__close:hover {
  background: var(--color-danger-900, rgba(239, 68, 68, 0.2));
  color: var(--color-danger-400, #f87171);
}

/* 系统深色模式偏好 - 仅在 html/body 有 auto-dark 类时启用 */
@media (prefers-color-scheme: dark) {
  .auto-dark .l-chrome-tabs,
  html.auto-dark .l-chrome-tabs,
  body.auto-dark .l-chrome-tabs {
    --tabs-bg: var(--color-gray-800, #1f2937);
    --tabs-item-bg-hover: var(--color-gray-700, #374151);
    --tabs-item-bg-active: var(--color-gray-900, #111827);
    --tabs-text-color: var(--color-gray-300, #d1d5db);
    --tabs-text-color-active: var(--color-gray-50, #f9fafb);
  }
}
</style>
