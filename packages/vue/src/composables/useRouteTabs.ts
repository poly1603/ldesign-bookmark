/**
 * 路由页签管理器
 *
 * 提供与 Vue Router 集成的页签管理功能
 * 自动监听路由变化，管理页签的添加、删除、切换等操作
 *
 * @module composables/useRouteTabs
 * @author LDesign Team
 * @since 1.0.0
 */
import type { InjectionKey, Ref } from 'vue'
import type { RouteLocationNormalized, Router } from 'vue-router'
import { inject, onMounted, onUnmounted, provide, ref } from 'vue'
import type { TabItem } from '../types'

/** 路由页签上下文 */
export interface RouteTabsContext {
  /** 页签列表 */
  tabs: Ref<TabItem[]>
  /** 当前激活的页签 key */
  activeKey: Ref<string>
  /** 刷新键（用于触发组件刷新） */
  refreshKey: Ref<number>
  /** 添加页签 */
  addTab: (tab: TabItem) => void
  /** 删除页签 */
  removeTab: (key: string) => void
  /** 切换页签 */
  switchTab: (key: string) => void
  /** 关闭当前页签 */
  closeCurrent: () => void
  /** 关闭其他页签 */
  closeOthers: (key?: string) => void
  /** 关闭左侧页签 */
  closeLeft: (key: string) => void
  /** 关闭右侧页签 */
  closeRight: (key: string) => void
  /** 关闭所有页签 */
  closeAll: () => void
  /** 刷新页签 */
  refreshTab: (key: string) => void
  /** 固定/取消固定页签 */
  togglePin: (key: string) => void
}

/** 路由页签配置 */
export interface RouteTabsConfig {
  /** 路由实例 */
  router: Router
  /** 首页路由路径 @default '/' */
  homePath?: string
  /** 首页标题 @default '首页' */
  homeTitle?: string
  /** 首页图标 @default '🏠' */
  homeIcon?: string
  /** 最大页签数 @default 20 */
  maxTabs?: number
  /** 是否缓存页签 @default true */
  cache?: boolean
  /** 缓存键名 @default 'route-tabs' */
  cacheKey?: string
  /** 排除的路由（不会添加到页签） */
  excludes?: string[]
}

/** 注入键 */
export const ROUTE_TABS_KEY: InjectionKey<RouteTabsContext> = Symbol('route-tabs')

/**
 * 创建路由页签管理器
 *
 * @param config - 配置项
 * @returns 路由页签上下文
 *
 * @example
 * ```ts
 * // 在根组件中创建
 * const router = useRouter()
 * const routeTabs = useRouteTabs({ router })
 *
 * // 在子组件中使用
 * const { tabs, activeKey, switchTab, removeTab } = useRouteTabsContext()
 * ```
 */
export function useRouteTabs(config: RouteTabsConfig): RouteTabsContext {
  const {
    router,
    homePath = '/',
    homeTitle = '首页',
    homeIcon = '🏠',
    maxTabs = 20,
    cache = true,
    cacheKey = 'route-tabs',
    excludes = ['/login', '/404', '/403', '/500'],
  } = config

  /** 页签列表 */
  const tabs = ref<TabItem[]>([])

  /** 当前激活的页签 key */
  const activeKey = ref<string>('')

  /** 刷新键（用于触发组件刷新） */
  const refreshKey = ref<number>(0)

  /** 根据路由生成页签 key */
  function getTabKey(route: RouteLocationNormalized): string {
    return route.fullPath
  }

  /** 根据路由生成页签标题 */
  function getTabTitle(route: RouteLocationNormalized): string {
    const meta = route.meta as Record<string, unknown>
    return (meta.title as string) || route.name?.toString() || route.path
  }

  /** 根据路由生成页签图标 */
  function getTabIcon(route: RouteLocationNormalized): string | undefined {
    const meta = route.meta as Record<string, unknown>
    return meta.icon as string | undefined
  }

  /** 判断路由是否应该被排除 */
  function isExcluded(path: string): boolean {
    return excludes.some(pattern => path.startsWith(pattern))
  }

  /** 添加页签 */
  function addTab(tab: TabItem): void {
    // 检查是否已存在
    const existIndex = tabs.value.findIndex(t => t.key === tab.key)
    if (existIndex !== -1) {
      // 已存在，只更新激活状态
      activeKey.value = tab.key
      return
    }

    // 检查最大页签数
    if (tabs.value.length >= maxTabs) {
      // 移除第一个非固定的页签
      const removeIndex = tabs.value.findIndex(t => !t.pinned && t.path !== homePath)
      if (removeIndex !== -1) {
        tabs.value.splice(removeIndex, 1)
      }
    }

    // 添加新页签
    tabs.value.push(tab)
    activeKey.value = tab.key
    saveTabs()
  }

  /** 删除页签 */
  function removeTab(key: string): void {
    const index = tabs.value.findIndex(t => t.key === key)
    if (index === -1)
      return

    const tab = tabs.value[index]
    // 不能关闭固定的页签
    if (tab.pinned)
      return
    // 不能关闭首页
    if (tab.path === homePath && tabs.value.length > 1)
      return

    tabs.value.splice(index, 1)

    // 如果关闭的是当前激活的页签，需要切换到其他页签
    if (activeKey.value === key) {
      const newTab = tabs.value[Math.min(index, tabs.value.length - 1)]
      if (newTab) {
        switchTab(newTab.key)
      }
    }
    saveTabs()
  }

  /** 切换页签 */
  function switchTab(key: string): void {
    const tab = tabs.value.find(t => t.key === key)
    if (tab && tab.path) {
      activeKey.value = key
      router.push(tab.path)
    }
  }

  /** 关闭当前页签 */
  function closeCurrent(): void {
    removeTab(activeKey.value)
  }

  /** 关闭其他页签 */
  function closeOthers(key?: string): void {
    const targetKey = key || activeKey.value
    tabs.value = tabs.value.filter(t => t.key === targetKey || t.pinned || t.path === homePath)
    // 如果当前激活的不在列表中，切换到目标页签
    if (!tabs.value.some(t => t.key === activeKey.value)) {
      const target = tabs.value.find(t => t.key === targetKey)
      if (target)
        switchTab(target.key)
    }
    saveTabs()
  }

  /** 关闭左侧页签 */
  function closeLeft(key: string): void {
    const index = tabs.value.findIndex(t => t.key === key)
    if (index === -1)
      return

    // 保留当前及右侧页签、固定页签、首页
    tabs.value = tabs.value.filter((t, i) => i >= index || t.pinned || t.path === homePath || t.isHome)
    saveTabs()
  }

  /** 关闭右侧页签 */
  function closeRight(key: string): void {
    const index = tabs.value.findIndex(t => t.key === key)
    if (index === -1)
      return

    // 保留当前及左侧页签、固定页签、首页
    tabs.value = tabs.value.filter((t, i) => i <= index || t.pinned || t.path === homePath || t.isHome)
    saveTabs()
  }

  /** 关闭所有页签 */
  function closeAll(): void {
    tabs.value = tabs.value.filter(t => t.pinned || t.path === homePath || t.isHome)
    // 切换到首页
    const homeTab = tabs.value.find(t => t.path === homePath)
    if (homeTab)
      switchTab(homeTab.key)
    saveTabs()
  }

  /**
   * 刷新页签
   *
   * 通过更新 refreshKey 触发 router-view 组件重新渲染
   * 使用路由 fullPath + 时间戳作为 key，确保组件完全重新创建
   */
  function refreshTab(key: string): void {
    const tab = tabs.value.find(t => t.key === key)
    if (tab && tab.key === activeKey.value) {
      // 更新刷新键，触发 router-view 重新渲染
      // 使用当前路由 fullPath 加时间戳，确保 key 变化
      const timestamp = Date.now()
      tab.refreshKey = timestamp
      refreshKey.value = timestamp
      console.log('[useRouteTabs] 刷新页签:', key, '新 refreshKey:', timestamp)
    }
  }

  /** 固定/取消固定页签 */
  function togglePin(key: string): void {
    const tab = tabs.value.find(t => t.key === key)
    if (tab) {
      tab.pinned = !tab.pinned
      saveTabs()
    }
  }

  /** 保存页签到本地存储 */
  function saveTabs(): void {
    if (!cache)
      return
    try {
      const data = tabs.value.map(t => ({
        key: t.key,
        title: t.title,
        icon: t.icon,
        path: t.path,
        pinned: t.pinned,
      }))
      localStorage.setItem(cacheKey, JSON.stringify(data))
    }
    catch (e) {
      console.warn('[useRouteTabs] 保存页签失败:', e)
    }
  }

  /** 从本地存储加载页签 */
  function loadTabs(): void {
    if (!cache)
      return
    try {
      const data = localStorage.getItem(cacheKey)
      if (data) {
        const parsed = JSON.parse(data) as TabItem[]
        tabs.value = parsed.map(t => ({
          ...t,
          closable: t.path !== homePath,
        }))
      }
    }
    catch (e) {
      console.warn('[useRouteTabs] 加载页签失败:', e)
    }
  }

  /** 初始化首页页签 */
  function initHomeTab(): void {
    const homeExists = tabs.value.some(t => t.path === homePath)
    if (!homeExists) {
      tabs.value.unshift({
        key: homePath,
        title: homeTitle,
        icon: homeIcon,
        path: homePath,
        closable: false,
        pinned: true,
        isHome: true,
      })
    }
    else {
      // 确保首页标签有 isHome 标记
      const homeTab = tabs.value.find(t => t.path === homePath)
      if (homeTab) {
        homeTab.isHome = true
        homeTab.pinned = true
        homeTab.closable = false
      }
    }
  }

  /** 处理路由变化 */
  function handleRouteChange(to: RouteLocationNormalized): void {
    // 排除的路由不添加页签
    if (isExcluded(to.path))
      return

    const key = getTabKey(to)
    const title = getTabTitle(to)
    const icon = getTabIcon(to)

    addTab({
      key,
      title,
      icon,
      path: to.fullPath,
      closable: to.path !== homePath,
    })
  }

  // 监听路由变化
  let unwatch: (() => void) | null = null

  onMounted(() => {
    // 加载缓存的页签
    loadTabs()
    // 初始化首页
    initHomeTab()

    // 处理当前路由
    handleRouteChange(router.currentRoute.value)

    // 监听路由变化
    unwatch = router.afterEach((to) => {
      handleRouteChange(to)
    })
  })

  onUnmounted(() => {
    if (unwatch) {
      unwatch()
      unwatch = null
    }
  })

  // 创建上下文
  const context: RouteTabsContext = {
    tabs,
    activeKey,
    refreshKey,
    addTab,
    removeTab,
    switchTab,
    closeCurrent,
    closeOthers,
    closeLeft,
    closeRight,
    closeAll,
    refreshTab,
    togglePin,
  }

  // 提供上下文
  provide(ROUTE_TABS_KEY, context)

  return context
}

/**
 * 获取路由页签上下文
 *
 * @returns 路由页签上下文
 * @throws 如果未在父组件中调用 useRouteTabs，则抛出错误
 *
 * @example
 * ```vue
 * <script setup>
 * import { useRouteTabsContext } from '@ldesign/bookmark-vue'
 *
 * const { tabs, activeKey, switchTab, removeTab } = useRouteTabsContext()
 * </script>
 * ```
 */
export function useRouteTabsContext(): RouteTabsContext {
  const context = inject(ROUTE_TABS_KEY)
  if (!context) {
    throw new Error('[useRouteTabsContext] 必须在调用 useRouteTabs 的组件内部使用')
  }
  return context
}

