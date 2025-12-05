/**
 * 主题系统 Composable
 * 提供深色/浅色主题切换功能
 * @module composables/useTheme
 */

import { computed, onMounted, ref, watch } from 'vue'

/**
 * 主题类型
 */
export type Theme = 'light' | 'dark' | 'auto'

/**
 * 主题配置
 */
export interface ThemeConfig {
  /** 默认主题 */
  defaultTheme?: Theme
  /** 存储键名 */
  storageKey?: string
  /** 是否持久化 */
  persistent?: boolean
  /** 主题变化回调 */
  onChange?: (theme: Theme) => void
}

/**
 * CSS 变量定义
 */
export interface ThemeVariables {
  // 主色
  '--l-primary-color': string
  '--l-primary-color-hover': string
  '--l-primary-color-active': string
  
  // 背景色
  '--l-bg-color': string
  '--l-bg-color-secondary': string
  '--l-bg-color-tertiary': string
  
  // 文本色
  '--l-text-color': string
  '--l-text-color-secondary': string
  '--l-text-color-disabled': string
  
  // 边框色
  '--l-border-color': string
  '--l-border-color-light': string
  
  // 阴影
  '--l-shadow-sm': string
  '--l-shadow-md': string
  '--l-shadow-lg': string
  
  // 圆角
  '--l-radius-sm': string
  '--l-radius-md': string
  '--l-radius-lg': string
  
  // 间距
  '--l-spacing-xs': string
  '--l-spacing-sm': string
  '--l-spacing-md': string
  '--l-spacing-lg': string
  '--l-spacing-xl': string
}

/**
 * 浅色主题变量
 */
const LIGHT_THEME: Partial<ThemeVariables> = {
  '--l-primary-color': '#1890ff',
  '--l-primary-color-hover': '#40a9ff',
  '--l-primary-color-active': '#096dd9',
  
  '--l-bg-color': '#ffffff',
  '--l-bg-color-secondary': '#fafafa',
  '--l-bg-color-tertiary': '#f5f5f5',
  
  '--l-text-color': 'rgba(0, 0, 0, 0.85)',
  '--l-text-color-secondary': 'rgba(0, 0, 0, 0.65)',
  '--l-text-color-disabled': 'rgba(0, 0, 0, 0.25)',
  
  '--l-border-color': '#d9d9d9',
  '--l-border-color-light': '#f0f0f0',
  
  '--l-shadow-sm': '0 2px 4px rgba(0, 0, 0, 0.08)',
  '--l-shadow-md': '0 4px 12px rgba(0, 0, 0, 0.12)',
  '--l-shadow-lg': '0 8px 24px rgba(0, 0, 0, 0.16)',
  
  '--l-radius-sm': '2px',
  '--l-radius-md': '4px',
  '--l-radius-lg': '8px',
  
  '--l-spacing-xs': '4px',
  '--l-spacing-sm': '8px',
  '--l-spacing-md': '16px',
  '--l-spacing-lg': '24px',
  '--l-spacing-xl': '32px',
}

/**
 * 深色主题变量
 */
const DARK_THEME: Partial<ThemeVariables> = {
  '--l-primary-color': '#177ddc',
  '--l-primary-color-hover': '#3c9ae8',
  '--l-primary-color-active': '#1765ad',
  
  '--l-bg-color': '#141414',
  '--l-bg-color-secondary': '#1f1f1f',
  '--l-bg-color-tertiary': '#2a2a2a',
  
  '--l-text-color': 'rgba(255, 255, 255, 0.85)',
  '--l-text-color-secondary': 'rgba(255, 255, 255, 0.65)',
  '--l-text-color-disabled': 'rgba(255, 255, 255, 0.25)',
  
  '--l-border-color': '#434343',
  '--l-border-color-light': '#303030',
  
  '--l-shadow-sm': '0 2px 4px rgba(0, 0, 0, 0.24)',
  '--l-shadow-md': '0 4px 12px rgba(0, 0, 0, 0.36)',
  '--l-shadow-lg': '0 8px 24px rgba(0, 0, 0, 0.48)',
  
  '--l-radius-sm': '2px',
  '--l-radius-md': '4px',
  '--l-radius-lg': '8px',
  
  '--l-spacing-xs': '4px',
  '--l-spacing-sm': '8px',
  '--l-spacing-md': '16px',
  '--l-spacing-lg': '24px',
  '--l-spacing-xl': '32px',
}

/**
 * 使用主题
 */
export function useTheme(config: ThemeConfig = {}) {
  const {
    defaultTheme = 'auto',
    storageKey = 'ldesign-theme',
    persistent = true,
    onChange,
  } = config

  // 当前主题
  const theme = ref<Theme>(defaultTheme)
  
  // 实际应用的主题（auto 会解析为 light 或 dark）
  const actualTheme = computed<'light' | 'dark'>(() => {
    if (theme.value === 'auto') {
      return getSystemTheme()
    }
    return theme.value
  })

  /**
   * 获取系统主题
   */
  function getSystemTheme(): 'light' | 'dark' {
    if (typeof window === 'undefined') return 'light'
    
    return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light'
  }

  /**
   * 设置主题
   */
  function setTheme(newTheme: Theme): void {
    theme.value = newTheme
    
    // 持久化
    if (persistent) {
      saveTheme(newTheme)
    }
    
    // 回调
    onChange?.(newTheme)
  }

  /**
   * 切换主题
   */
  function toggleTheme(): void {
    const nextTheme = actualTheme.value === 'light' ? 'dark' : 'light'
    setTheme(nextTheme)
  }

  /**
   * 应用主题变量到 DOM
   */
  function applyThemeVariables(themeType: 'light' | 'dark'): void {
    const variables = themeType === 'dark' ? DARK_THEME : LIGHT_THEME
    const root = document.documentElement
    
    Object.entries(variables).forEach(([key, value]) => {
      root.style.setProperty(key, value)
    })
    
    // 添加主题类名
    root.classList.remove('l-theme-light', 'l-theme-dark')
    root.classList.add(`l-theme-${themeType}`)
    
    // 设置 data 属性
    root.setAttribute('data-theme', themeType)
  }

  /**
   * 保存主题到存储
   */
  function saveTheme(themeToSave: Theme): void {
    try {
      localStorage.setItem(storageKey, themeToSave)
    } catch (error) {
      console.warn('[useTheme] Failed to save theme:', error)
    }
  }

  /**
   * 从存储加载主题
   */
  function loadTheme(): Theme {
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved && ['light', 'dark', 'auto'].includes(saved)) {
        return saved as Theme
      }
    } catch (error) {
      console.warn('[useTheme] Failed to load theme:', error)
    }
    return defaultTheme
  }

  /**
   * 监听系统主题变化
   */
  function watchSystemTheme(): void {
    if (typeof window === 'undefined') return
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => {
      if (theme.value === 'auto') {
        applyThemeVariables(actualTheme.value)
      }
    }
    
    // 现代浏览器
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handler)
    } else {
      // 旧版浏览器
      mediaQuery.addListener(handler)
    }
  }

  /**
   * 自定义主题变量
   */
  function setCustomVariables(variables: Partial<ThemeVariables>): void {
    const root = document.documentElement
    Object.entries(variables).forEach(([key, value]) => {
      root.style.setProperty(key, value)
    })
  }

  /**
   * 获取当前主题变量
   */
  function getThemeVariables(): Partial<ThemeVariables> {
    return actualTheme.value === 'dark' ? DARK_THEME : LIGHT_THEME
  }

  // 监听主题变化
  watch(actualTheme, (newTheme) => {
    applyThemeVariables(newTheme)
  })

  // 初始化
  onMounted(() => {
    // 加载保存的主题
    if (persistent) {
      theme.value = loadTheme()
    }
    
    // 应用主题
    applyThemeVariables(actualTheme.value)
    
    // 监听系统主题变化
    watchSystemTheme()
  })

  return {
    // 状态
    theme,
    actualTheme,
    isDark: computed(() => actualTheme.value === 'dark'),
    isLight: computed(() => actualTheme.value === 'light'),
    isAuto: computed(() => theme.value === 'auto'),
    
    // 方法
    setTheme,
    toggleTheme,
    setCustomVariables,
    getThemeVariables,
  }
}

/**
 * 主题预设
 */
export const THEME_PRESETS = {
  light: LIGHT_THEME,
  dark: DARK_THEME,
} as const

/**
 * 创建自定义主题
 */
export function createCustomTheme(
  baseTheme: 'light' | 'dark',
  overrides: Partial<ThemeVariables>,
): Partial<ThemeVariables> {
  const base = baseTheme === 'dark' ? DARK_THEME : LIGHT_THEME
  return { ...base, ...overrides }
}