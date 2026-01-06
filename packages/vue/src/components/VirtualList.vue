<script setup lang="ts" generic="T">
/**
 * 虚拟滚动列表组件
 * 用于大量数据渲染优化，支持固定高度和动态高度
 *
 * @example
 * ```vue
 * <VirtualList
 *   :items="bookmarks"
 *   :item-height="40"
 *   :height="400"
 *   v-slot="{ item, index }"
 * >
 *   <BookmarkItem :item="item" />
 * </VirtualList>
 * ```
 */
import { computed, onMounted, onUnmounted, ref, watch, nextTick, shallowRef } from 'vue'

/**
 * 项目尺寸信息
 */
interface ItemSize {
  height: number
  top: number
}

/**
 * 组件属性
 */
interface Props {
  /** 数据列表 */
  items: T[]
  /** 每项高度（固定高度或默认高度） */
  itemHeight?: number
  /** 容器高度 */
  height?: number | string
  /** 缓冲区大小（上下各渲染多少项） */
  buffer?: number
  /** 唯一键名 */
  keyField?: keyof T
  /** 是否启用动态高度 */
  dynamicHeight?: boolean
  /** 估算高度（动态高度模式下的初始估计） */
  estimatedHeight?: number
  /** 是否启用 RAF 优化 */
  useRAF?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  height: '100%',
  buffer: 5,
  keyField: 'id' as keyof T,
  itemHeight: 40,
  dynamicHeight: false,
  estimatedHeight: 40,
  useRAF: true,
})

/**
 * 组件事件
 */
const emit = defineEmits<{
  scroll: [event: Event]
  'visible-change': [startIndex: number, endIndex: number]
}>()

// 容器引用
const containerRef = ref<HTMLElement>()
const listRef = ref<HTMLElement>()

// 滚动位置
const scrollTop = ref(0)

// 容器高度
const containerHeight = ref(0)

// RAF 相关
let rafId: number | null = null
let isScrolling = false
const pendingScrollTop = ref(0)

// 动态高度缓存
const itemSizesCache = shallowRef<Map<string | number, ItemSize>>(new Map())
const measuredIndex = ref(-1)

/**
 * 获取项目的唯一键
 */
function getItemKey(item: T, index: number): string | number {
  if (props.keyField && typeof item === 'object' && item !== null) {
    const key = (item as Record<string, unknown>)[props.keyField as string]
    if (key !== undefined) return key as string | number
  }
  return index
}

/**
 * 获取项目高度
 */
function getItemHeight(index: number): number {
  if (!props.dynamicHeight) {
    return props.itemHeight
  }

  const item = props.items[index]
  if (!item) return props.estimatedHeight

  const key = getItemKey(item, index)
  const cached = itemSizesCache.value.get(key)
  return cached?.height ?? props.estimatedHeight
}

/**
 * 获取项目顶部位置
 */
function getItemTop(index: number): number {
  if (!props.dynamicHeight) {
    return index * props.itemHeight
  }

  let top = 0
  for (let i = 0; i < index; i++) {
    top += getItemHeight(i)
  }
  return top
}

// 总高度
const totalHeight = computed(() => {
  if (!props.dynamicHeight) {
    return props.items.length * props.itemHeight
  }

  let total = 0
  for (let i = 0; i < props.items.length; i++) {
    total += getItemHeight(i)
  }
  return total
})

/**
 * 二分查找开始索引（动态高度）
 */
function findStartIndex(scrollTop: number): number {
  if (!props.dynamicHeight) {
    return Math.floor(scrollTop / props.itemHeight)
  }

  let low = 0
  let high = props.items.length - 1

  while (low <= high) {
    const mid = Math.floor((low + high) / 2)
    const midTop = getItemTop(mid)
    const midBottom = midTop + getItemHeight(mid)

    if (midTop <= scrollTop && midBottom > scrollTop) {
      return mid
    } else if (midTop > scrollTop) {
      high = mid - 1
    } else {
      low = mid + 1
    }
  }

  return Math.max(0, low)
}

// 可见区域的开始和结束索引
const visibleRange = computed(() => {
  const start = findStartIndex(scrollTop.value)

  let end = start
  let accumulatedHeight = 0
  const viewportHeight = containerHeight.value

  while (end < props.items.length && accumulatedHeight < viewportHeight) {
    accumulatedHeight += getItemHeight(end)
    end++
  }

  return {
    start: Math.max(0, start - props.buffer),
    end: Math.min(props.items.length, end + props.buffer),
  }
})

// 可见项列表
const visibleItems = computed(() => {
  return props.items.slice(visibleRange.value.start, visibleRange.value.end)
})

// 偏移量
const offsetY = computed(() => {
  return getItemTop(visibleRange.value.start)
})

/**
 * 处理滚动（带 RAF 优化）
 */
function handleScroll(event: Event): void {
  const target = event.target as HTMLElement

  if (props.useRAF) {
    pendingScrollTop.value = target.scrollTop

    if (!isScrolling) {
      isScrolling = true
      rafId = requestAnimationFrame(updateScrollPosition)
    }
  } else {
    scrollTop.value = target.scrollTop
  }

  emit('scroll', event)
}

/**
 * 更新滚动位置（RAF 回调）
 */
function updateScrollPosition(): void {
  scrollTop.value = pendingScrollTop.value
  isScrolling = false

  // 发送可见范围变化事件
  emit('visible-change', visibleRange.value.start, visibleRange.value.end)
}

/**
 * 更新容器高度
 */
function updateContainerHeight(): void {
  if (containerRef.value) {
    containerHeight.value = containerRef.value.clientHeight
  }
}

/**
 * 更新项目高度（动态高度模式）
 */
function updateItemSize(index: number, height: number): void {
  if (!props.dynamicHeight) return

  const item = props.items[index]
  if (!item) return

  const key = getItemKey(item, index)
  const currentCache = itemSizesCache.value

  const existing = currentCache.get(key)
  if (existing?.height !== height) {
    const newCache = new Map(currentCache)
    newCache.set(key, {
      height,
      top: getItemTop(index),
    })
    itemSizesCache.value = newCache
    measuredIndex.value = Math.max(measuredIndex.value, index)
  }
}

/**
 * 测量所有可见项的高度
 */
function measureVisibleItems(): void {
  if (!props.dynamicHeight || !listRef.value) return

  nextTick(() => {
    const children = listRef.value?.children
    if (!children) return

    for (let i = 0; i < children.length; i++) {
      const child = children[i] as HTMLElement
      const index = visibleRange.value.start + i
      const height = child.offsetHeight
      if (height > 0) {
        updateItemSize(index, height)
      }
    }
  })
}

/**
 * 滚动到指定索引
 */
function scrollToIndex(index: number, behavior: ScrollBehavior = 'smooth'): void {
  if (containerRef.value) {
    const targetScrollTop = getItemTop(index)
    containerRef.value.scrollTo({
      top: targetScrollTop,
      behavior,
    })
  }
}

/**
 * 滚动到顶部
 */
function scrollToTop(behavior: ScrollBehavior = 'smooth'): void {
  scrollToIndex(0, behavior)
}

/**
 * 滚动到底部
 */
function scrollToBottom(behavior: ScrollBehavior = 'smooth'): void {
  scrollToIndex(props.items.length - 1, behavior)
}

/**
 * 重置高度缓存
 */
function resetHeightCache(): void {
  itemSizesCache.value = new Map()
  measuredIndex.value = -1
}

// 监听尺寸变化
let resizeObserver: ResizeObserver | null = null

onMounted(() => {
  updateContainerHeight()

  if (containerRef.value) {
    resizeObserver = new ResizeObserver(() => {
      updateContainerHeight()
    })
    resizeObserver.observe(containerRef.value)
  }

  // 动态高度模式下，测量初始可见项
  if (props.dynamicHeight) {
    measureVisibleItems()
  }
})

onUnmounted(() => {
  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }

  // 清理 RAF
  if (rafId !== null) {
    cancelAnimationFrame(rafId)
    rafId = null
  }
})

// 监听 items 变化
watch(() => props.items.length, (newLen, oldLen) => {
  // 重置滚动位置
  if (scrollTop.value > totalHeight.value) {
    scrollTop.value = 0
    if (containerRef.value) {
      containerRef.value.scrollTop = 0
    }
  }

  // 动态高度模式下，重置缓存
  if (props.dynamicHeight && newLen !== oldLen) {
    resetHeightCache()
    nextTick(measureVisibleItems)
  }
})

// 监听可见范围变化，重新测量
watch(
  () => visibleRange.value,
  () => {
    if (props.dynamicHeight) {
      nextTick(measureVisibleItems)
    }
  },
  { deep: true },
)

// 暴露方法
defineExpose({
  /** 滚动到指定索引 */
  scrollToIndex,
  /** 滚动到顶部 */
  scrollToTop,
  /** 滚动到底部 */
  scrollToBottom,
  /** 获取当前滚动位置 */
  getScrollTop: () => scrollTop.value,
  /** 重置高度缓存 */
  resetHeightCache,
  /** 手动更新项目高度 */
  updateItemSize,
  /** 获取可见范围 */
  getVisibleRange: () => visibleRange.value,
})
</script>

<template>
  <div
    ref="containerRef"
    class="l-virtual-list"
    :style="{ height: typeof height === 'number' ? `${height}px` : height }"
    role="list"
    @scroll.passive="handleScroll"
  >
    <!-- 占位元素，擑起总高度 -->
    <div
      class="l-virtual-list__phantom"
      :style="{ height: `${totalHeight}px` }"
      aria-hidden="true"
    />
    <!-- 实际渲染内容 -->
    <div
      ref="listRef"
      class="l-virtual-list__content"
      :style="{ transform: `translateY(${offsetY}px)` }"
    >
      <div
        v-for="(item, index) in visibleItems"
        :key="getItemKey(item, visibleRange.start + index)"
        class="l-virtual-list__item"
        :style="dynamicHeight ? {} : { height: `${itemHeight}px` }"
        role="listitem"
      >
        <slot
          :item="item"
          :index="visibleRange.start + index"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.l-virtual-list {
  overflow-y: auto;
  overflow-x: hidden;
  position: relative;
  -webkit-overflow-scrolling: touch;
  /* 优化滚动性能 */
  contain: strict;
}

.l-virtual-list__phantom {
  position: absolute;
  left: 0;
  top: 0;
  right: 0;
  z-index: -1;
  /* 不影响布局 */
  pointer-events: none;
}

.l-virtual-list__content {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  /* 提示浏览器该元素会变化 */
  will-change: transform;
  /* 启用硬件加速 */
  transform: translateZ(0);
}

.l-virtual-list__item {
  overflow: hidden;
  /* 防止 margin 合并 */
  contain: content;
}

/* 滚动条样式 */
.l-virtual-list::-webkit-scrollbar {
  width: 8px;
}

.l-virtual-list::-webkit-scrollbar-track {
  background: var(--l-virtual-list-scrollbar-track, #f1f1f1);
  border-radius: 4px;
}

.l-virtual-list::-webkit-scrollbar-thumb {
  background: var(--l-virtual-list-scrollbar-thumb, #c1c1c1);
  border-radius: 4px;
}

.l-virtual-list::-webkit-scrollbar-thumb:hover {
  background: var(--l-virtual-list-scrollbar-thumb-hover, #a8a8a8);
}
</style>
