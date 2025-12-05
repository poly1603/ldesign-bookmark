/**
 * 响应式布局 Composable
 * 提供响应式断点和设备检测
 * @module composables/useResponsive
 */

import { computed, onMounted, onUnmounted, ref, type Ref } from 'vue'

/**
 * 响应式断点
 */
export const BREAKPOINTS = {
  xs: 480,
  sm: 576,
  md: 768,
  lg: 992,
  xl: 1200,
  xxl: 1600,
} as const

export type Breakpoint = keyof typeof BREAKPOINTS

/**
 * 屏幕尺寸
 */
export interface ScreenSize {
  width: number
  height: number
}

/**
 * 设备类型
 */
export type DeviceType = 'mobile' | 'tablet' | 'desktop'

/**
 * 使用响应式布局
 */
export function useResponsive() {
  // 当前窗口尺寸
  const windowSize = ref<ScreenSize>({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
  })

  /**
   * 当前断点
   */
  const currentBreakpoint = computed<Breakpoint>(() => {
    const width = windowSize.value.width
    
    if (width < BREAKPOINTS.xs) return 'xs'
    if (width < BREAKPOINTS.sm) return 'sm'
    if (width < BREAKPOINTS.md) return 'md'
    if (width < BREAKPOINTS.lg) return 'lg'
    if (width < BREAKPOINTS.xl) return 'xl'
    return 'xxl'
  })

  /**
   * 设备类型
   */
  const deviceType = computed<DeviceType>(() => {
    const width = windowSize.value.width
    
    if (width < BREAKPOINTS.md) return 'mobile'
    if (width < BREAKPOINTS.lg) return 'tablet'
    return 'desktop'
  })

  /**
   * 是否为移动设备
   */
  const isMobile = computed(() => deviceType.value === 'mobile')

  /**
   * 是否为平板
   */
  const isTablet = computed(() => deviceType.value === 'tablet')

  /**
   * 是否为桌面
   */
  const isDesktop = computed(() => deviceType.value === 'desktop')

  /**
   * 是否为触摸设备
   */
  const isTouchDevice = computed(() => {
    if (typeof window === 'undefined') return false
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0
  })

  /**
   * 屏幕方向
   */
  const orientation = computed<'portrait' | 'landscape'>(() => {
    return windowSize.value.width > windowSize.value.height
      ? 'landscape'
      : 'portrait'
  })

  /**
   * 是否为竖屏
   */
  const isPortrait = computed(() => orientation.value === 'portrait')

  /**
   * 是否为横屏
   */
  const isLandscape = computed(() => orientation.value === 'landscape')

  /**
   * 检查是否大于等于指定断点
   */
  function isGreaterThan(breakpoint: Breakpoint): boolean {
    return windowSize.value.width >= BREAKPOINTS[breakpoint]
  }

  /**
   * 检查是否小于等于指定断点
   */
  function isLessThan(breakpoint: Breakpoint): boolean {
    return windowSize.value.width <= BREAKPOINTS[breakpoint]
  }

  /**
   * 检查是否在指定断点范围内
   */
  function isBetween(min: Breakpoint, max: Breakpoint): boolean {
    const width = windowSize.value.width
    return width >= BREAKPOINTS[min] && width <= BREAKPOINTS[max]
  }

  /**
   * 更新窗口尺寸
   */
  function updateSize(): void {
    windowSize.value = {
      width: window.innerWidth,
      height: window.innerHeight,
    }
  }

  /**
   * 防抖的 resize 处理器
   */
  let resizeTimer: NodeJS.Timeout | undefined
  function handleResize(): void {
    if (resizeTimer) {
      clearTimeout(resizeTimer)
    }
    resizeTimer = setTimeout(() => {
      updateSize()
    }, 150)
  }

  // 挂载时监听 resize
  onMounted(() => {
    window.addEventListener('resize', handleResize)
    updateSize()
  })

  // 卸载时清理
  onUnmounted(() => {
    window.removeEventListener('resize', handleResize)
    if (resizeTimer) {
      clearTimeout(resizeTimer)
    }
  })

  return {
    // 状态
    windowSize,
    currentBreakpoint,
    deviceType,
    orientation,
    
    // 计算属性
    isMobile,
    isTablet,
    isDesktop,
    isTouchDevice,
    isPortrait,
    isLandscape,
    
    // 方法
    isGreaterThan,
    isLessThan,
    isBetween,
  }
}

/**
 * 媒体查询 Hook
 */
export function useMediaQuery(query: string) {
  const matches = ref(false)

  let mediaQuery: MediaQueryList | null = null

  /**
   * 更新匹配状态
   */
  function updateMatches(event?: MediaQueryListEvent): void {
    matches.value = event ? event.matches : mediaQuery?.matches || false
  }

  onMounted(() => {
    if (typeof window === 'undefined') return
    
    mediaQuery = window.matchMedia(query)
    matches.value = mediaQuery.matches
    
    // 监听变化
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', updateMatches)
    } else {
      // 旧版浏览器
      mediaQuery.addListener(updateMatches)
    }
  })

  onUnmounted(() => {
    if (!mediaQuery) return
    
    if (mediaQuery.removeEventListener) {
      mediaQuery.removeEventListener('change', updateMatches)
    } else {
      mediaQuery.removeListener(updateMatches)
    }
  })

  return matches
}

/**
 * 预定义的媒体查询
 */
export function usePrefersDark() {
  return useMediaQuery('(prefers-color-scheme: dark)')
}

export function usePrefersReducedMotion() {
  return useMediaQuery('(prefers-reduced-motion: reduce)')
}

export function usePrefersContrast() {
  return useMediaQuery('(prefers-contrast: high)')
}

/**
 * 获取设备信息
 */
export function getDeviceInfo() {
  if (typeof navigator === 'undefined') {
    return {
      platform: 'unknown',
      userAgent: '',
      isMac: false,
      isWindows: false,
      isLinux: false,
      isIOS: false,
      isAndroid: false,
    }
  }

  const ua = navigator.userAgent
  const platform = navigator.platform

  return {
    platform,
    userAgent: ua,
    isMac: /Mac/.test(platform),
    isWindows: /Win/.test(platform),
    isLinux: /Linux/.test(platform),
    isIOS: /iPhone|iPad|iPod/.test(ua),
    isAndroid: /Android/.test(ua),
  }
}

/**
 * 容器查询 Hook（实验性）
 */
export function useContainerQuery(
  container: Ref<HTMLElement | null>,
  breakpoints: Partial<typeof BREAKPOINTS>,
) {
  const currentSize = ref(0)
  const currentBreakpoint = ref<string>('')

  let resizeObserver: ResizeObserver | null = null

  function updateBreakpoint(width: number): void {
    currentSize.value = width
    
    const entries = Object.entries(breakpoints).sort((a, b) => b[1] - a[1])
    for (const [name, value] of entries) {
      if (width >= value) {
        currentBreakpoint.value = name
        return
      }
    }
    currentBreakpoint.value = entries[entries.length - 1]?.[0] || ''
  }

  onMounted(() => {
    if (!container.value) return
    
    resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        updateBreakpoint(entry.contentRect.width)
      }
    })
    
    resizeObserver.observe(container.value)
  })

  onUnmounted(() => {
    if (resizeObserver) {
      resizeObserver.disconnect()
    }
  })

  return {
    currentSize,
    currentBreakpoint,
  }
}