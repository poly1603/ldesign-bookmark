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
}

const props = withDefaults(defineProps<Props>(), {
  tabs: () => [],
  height: 44,
  showAdd: false,
  showMore: false,
  variant: 'chrome',
  maxTabs: 20,
  showIcon: true,
})

const emit = defineEmits<{
  /** 标签切换 */
  change: [key: string]
  /** 关闭标签 */
  close: [key: string]
  /** 添加标签 */
  add: []
  /** 右键菜单动作 */
  contextAction: [action: ChromeTabContextAction, tab: ChromeTabItem, index: number]
  /** 锁定/解锁标签 */
  togglePin: [key: string]
  /** 刷新标签 */
  refresh: [key: string]
  /** 关闭左侧 */
  closeLeft: [key: string]
  /** 关闭右侧 */
  closeRight: [key: string]
  /** 关闭其他 */
  closeOthers: [key: string]
  /** 关闭全部 */
  closeAll: []
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
          :class="['l-chrome-tabs__item', { 'l-chrome-tabs__item--active': isActive(tab.key), 'l-chrome-tabs__item--pinned': tab.pinned, 'l-chrome-tabs__item--home': tab.isHome }]"
          @click="handleTabClick(tab)" @contextmenu="showContextMenu($event, tab, index)">
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
/* ==================== 基础容器 ==================== */
.l-chrome-tabs {
  display: flex;
  align-items: flex-end;
  background-color: #dee1e6;
  padding: 6px 0 0 0;
  gap: 0;
  user-select: none;
  box-sizing: border-box;
  font-size: 13px;
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
  width: 28px;
  height: 28px;
  padding: 0;
  background: rgba(0, 0, 0, 0.05);
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
  color: #5f6368;
  margin-bottom: 4px;
}

.l-chrome-tabs__scroll-btn:hover {
  background: rgba(0, 0, 0, 0.1);
}

.l-chrome-tabs__scroll-btn--left {
  margin-right: 4px;
}

.l-chrome-tabs__scroll-btn--right {
  margin-left: 4px;
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
  padding: 8px 30px;
  margin: 0 -15px;
  color: #5f6368;
  transition: 0.2s;
  box-sizing: border-box;
  flex-shrink: 0;
  /* Chrome 风格圆角遮罩 */
  -webkit-mask-box-image: url("data:image/svg+xml,%3Csvg width='67' height='33' viewBox='0 0 67 33' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath fill-rule='evenodd' clip-rule='evenodd' d='M27 0c-6.627 0-12 5.373-12 12v6c0 8.284-6.716 15-15 15h67c-8.284 0-15-6.716-15-15v-6c0-6.627-5.373-12-12-12H27z' fill='%23000'/%3E%3C/svg%3E") 12 27 15;
}

.l-chrome-tabs__item:first-child {
  margin-left: 0;
}

.l-chrome-tabs__item:last-child {
  margin-right: 0;
}

/* Chrome 变体样式 */
.l-chrome-tabs--chrome .l-chrome-tabs__item {
  background: transparent;
}

.l-chrome-tabs--chrome .l-chrome-tabs__item:hover {
  background: #cfd2d6;
}

.l-chrome-tabs--chrome .l-chrome-tabs__item--active {
  background: #fff;
  z-index: 1;
  color: #202124;
  font-weight: 500;
}

.l-chrome-tabs--chrome .l-chrome-tabs__item--active:hover {
  background: #fff;
}

/* ==================== 标签内容 ==================== */
.l-chrome-tabs__item-wrap {
  display: flex;
  align-items: center;
  gap: 6px;
  max-width: 100%;
  overflow: hidden;
}

.l-chrome-tabs__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 16px;
  height: 16px;
}

.l-chrome-tabs__title {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
}

.l-chrome-tabs__lock {
  display: flex;
  align-items: center;
  color: #9aa0a6;
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
  color: #5f6368;
  opacity: 0;
  transition: all 0.15s;
  flex-shrink: 0;
}

.l-chrome-tabs__item:hover .l-chrome-tabs__close {
  opacity: 1;
}

.l-chrome-tabs__close:hover {
  background: rgba(0, 0, 0, 0.1);
  color: #202124;
}

/* ==================== 添加/更多按钮 ==================== */
.l-chrome-tabs__add,
.l-chrome-tabs__more-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  background: transparent;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  color: #5f6368;
  margin-bottom: 4px;
  transition: all 0.2s;
}

.l-chrome-tabs__add:hover,
.l-chrome-tabs__more-btn:hover {
  background: rgba(0, 0, 0, 0.08);
}

/* ==================== 右键菜单 ==================== */
.l-chrome-tabs__context-menu {
  position: fixed;
  min-width: 160px;
  padding: 4px 0;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  z-index: 9999;
}

.l-chrome-tabs__context-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 14px;
  cursor: pointer;
  color: #333;
  font-size: 13px;
  transition: background 0.15s;
}

.l-chrome-tabs__context-item:hover {
  background: rgba(0, 0, 0, 0.04);
}

.l-chrome-tabs__context-item--disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.l-chrome-tabs__context-icon {
  color: #666;
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

.tab-enter-active {
  transition: all 0.25s ease-out;
}

.tab-leave-active {
  transition: all 0.2s ease-in;
}

.tab-enter-from {
  opacity: 0;
  transform: translateX(-20px);
}

.tab-leave-to {
  opacity: 0;
  transform: translateX(20px) scale(0.9);
}

.tab-move {
  transition: transform 0.25s ease;
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
.l-chrome-tabs--card .l-chrome-tabs__item {
  background: #e8eaed;
  border-radius: 8px 8px 0 0;
  margin: 0 2px;
  -webkit-mask-box-image: none;
}

.l-chrome-tabs--card .l-chrome-tabs__item:hover {
  background: #f1f3f4;
}

.l-chrome-tabs--card .l-chrome-tabs__item--active {
  background: #fff;
}

.l-chrome-tabs--line .l-chrome-tabs__item {
  border-bottom: 2px solid transparent;
  border-radius: 0;
  margin: 0;
  padding: 0 16px;
  -webkit-mask-box-image: none;
  background: transparent;
}

.l-chrome-tabs--line .l-chrome-tabs__item:hover {
  background: rgba(0, 0, 0, 0.04);
}

.l-chrome-tabs--line .l-chrome-tabs__item--active {
  border-bottom-color: #1a73e8;
  color: #1a73e8;
  background: transparent;
}

.l-chrome-tabs--rounded .l-chrome-tabs__item {
  background: #e8eaed;
  border-radius: 20px;
  margin: 0 4px;
  -webkit-mask-box-image: none;
}

.l-chrome-tabs--rounded .l-chrome-tabs__item:hover {
  background: #d3d5d9;
}

.l-chrome-tabs--rounded .l-chrome-tabs__item--active {
  background: #fff;
}

/* ==================== 暗色模式 ==================== */
@media (prefers-color-scheme: dark) {
  .l-chrome-tabs {
    background-color: #53565a;
  }

  .l-chrome-tabs--chrome .l-chrome-tabs__item {
    color: #e8eaed;
  }

  .l-chrome-tabs--chrome .l-chrome-tabs__item:hover {
    background: #6b6e72;
  }

  .l-chrome-tabs--chrome .l-chrome-tabs__item--active {
    background: #3c4043;
    color: #fff;
  }

  .l-chrome-tabs--chrome .l-chrome-tabs__item--active:hover {
    background: #3c4043;
  }

  .l-chrome-tabs__scroll-btn,
  .l-chrome-tabs__add,
  .l-chrome-tabs__more-btn {
    color: #e8eaed;
  }

  .l-chrome-tabs__scroll-btn:hover,
  .l-chrome-tabs__add:hover,
  .l-chrome-tabs__more-btn:hover {
    background: rgba(255, 255, 255, 0.12);
  }

  .l-chrome-tabs__close {
    color: #bdc1c6;
  }

  .l-chrome-tabs__close:hover {
    background: rgba(255, 255, 255, 0.15);
    color: #fff;
  }

  .l-chrome-tabs__context-menu {
    background: #3c4043;
    box-shadow: 0 2px 6px 2px rgba(0, 0, 0, 0.3);
  }

  .l-chrome-tabs__context-item {
    color: #e8eaed;
  }

  .l-chrome-tabs__context-item:hover {
    background: rgba(255, 255, 255, 0.08);
  }

  .l-chrome-tabs__context-icon {
    color: #bdc1c6;
  }
}
</style>
