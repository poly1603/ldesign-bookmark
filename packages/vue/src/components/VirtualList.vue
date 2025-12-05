<script setup lang="ts" generic="T">
/**
 * 虚拟滚动列表组件
 * 用于大量数据渲染优化
 */
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'

/**
 * 组件属性
 */
interface Props {
  /** 数据列表 */
  items: T[]
  /** 每项高度（固定高度） */
  itemHeight: number
  /** 容器高度 */
  height?: number | string
  /** 缓冲区大小（上下各渲染多少项） */
  buffer?: number
  /** 唯一键名 */
  keyField?: keyof T
}

const props = withDefaults(defineProps<Props>(), {
  height: '100%',
  buffer: 5,
  keyField: 'id' as keyof T,
})

/**
 * 组件事件
 */
const emit = defineEmits<{
  scroll: [event: Event]
}>()

// 容器引用
const containerRef = ref<HTMLElement>()
const listRef = ref<HTMLElement>()

// 滚动位置
const scrollTop = ref(0)

// 容器高度
const containerHeight = ref(0)

// 可见区域的开始和结束索引
const visibleRange = computed(() => {
  const start = Math.floor(scrollTop.value / props.itemHeight)
  const end = Math.ceil((scrollTop.value + containerHeight.value) / props.itemHeight)
  
  return {
    start: Math.max(0, start - props.buffer),
    end: Math.min(props.items.length, end + props.buffer),
  }
})

// 可见项列表
const visibleItems = computed(() => {
  return props.items.slice(visibleRange.value.start, visibleRange.value.end)
})

// 总高度
const totalHeight = computed(() => {
  return props.items.length * props.itemHeight
})

// 偏移量
const offsetY = computed(() => {
  return visibleRange.value.start * props.itemHeight
})

// 获取项的唯一键
function getItemKey(item: T, index: number): string | number {
  if (props.keyField && typeof item === 'object' && item !== null) {
    const key = (item as any)[props.keyField]
    if (key !== undefined) return key
  }
  return index
}

// 处理滚动
function handleScroll(event: Event): void {
  const target = event.target as HTMLElement
  scrollTop.value = target.scrollTop
  emit('scroll', event)
}

// 更新容器高度
function updateContainerHeight(): void {
  if (containerRef.value) {
    containerHeight.value = containerRef.value.clientHeight
  }
}

// 滚动到指定索引
function scrollToIndex(index: number, behavior: ScrollBehavior = 'smooth'): void {
  if (containerRef.value) {
    const targetScrollTop = index * props.itemHeight
    containerRef.value.scrollTo({
      top: targetScrollTop,
      behavior,
    })
  }
}

// 滚动到顶部
function scrollToTop(behavior: ScrollBehavior = 'smooth'): void {
  scrollToIndex(0, behavior)
}

// 滚动到底部
function scrollToBottom(behavior: ScrollBehavior = 'smooth'): void {
  scrollToIndex(props.items.length - 1, behavior)
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
})

onUnmounted(() => {
  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }
})

// 监听items变化，重置滚动位置
watch(() => props.items.length, () => {
  if (scrollTop.value > totalHeight.value) {
    scrollTop.value = 0
    if (containerRef.value) {
      containerRef.value.scrollTop = 0
    }
  }
})

// 暴露方法
defineExpose({
  scrollToIndex,
  scrollToTop,
  scrollToBottom,
  getScrollTop: () => scrollTop.value,
})
</script>

<template>
  <div
    ref="containerRef"
    class="l-virtual-list"
    :style="{ height: typeof height === 'number' ? `${height}px` : height }"
    @scroll="handleScroll"
  >
    <div
      class="l-virtual-list__phantom"
      :style="{ height: `${totalHeight}px` }"
    />
    <div
      ref="listRef"
      class="l-virtual-list__content"
      :style="{ transform: `translateY(${offsetY}px)` }"
    >
      <div
        v-for="(item, index) in visibleItems"
        :key="getItemKey(item, visibleRange.start + index)"
        class="l-virtual-list__item"
        :style="{ height: `${itemHeight}px` }"
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
}

.l-virtual-list__phantom {
  position: absolute;
  left: 0;
  top: 0;
  right: 0;
  z-index: -1;
}

.l-virtual-list__content {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  will-change: transform;
}

.l-virtual-list__item {
  overflow: hidden;
}
</style>