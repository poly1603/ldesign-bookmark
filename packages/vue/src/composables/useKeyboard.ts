/**
 * 键盘快捷键 Composable
 * 提供全局键盘快捷键支持
 * @module composables/useKeyboard
 */

import { onMounted, onUnmounted, type Ref } from 'vue'

/**
 * 快捷键配置
 */
export interface KeyboardShortcut {
  /** 键值（支持组合键，如 'Ctrl+S', 'Cmd+K' 等） */
  key: string
  /** 快捷键描述 */
  description?: string
  /** 回调函数 */
  handler: (event: KeyboardEvent) => void
  /** 是否阻止默认行为 */
  preventDefault?: boolean
  /** 是否停止传播 */
  stopPropagation?: boolean
  /** 是否在输入框中也触发 */
  allowInInput?: boolean
}

/**
 * 修饰键映射
 */
const MODIFIER_KEYS = {
  ctrl: 'ctrlKey',
  control: 'ctrlKey',
  cmd: 'metaKey',
  command: 'metaKey',
  meta: 'metaKey',
  shift: 'shiftKey',
  alt: 'altKey',
  option: 'altKey',
} as const

/**
 * 特殊键映射
 */
const SPECIAL_KEYS: Record<string, string> = {
  enter: 'Enter',
  return: 'Enter',
  esc: 'Escape',
  escape: 'Escape',
  space: ' ',
  spacebar: ' ',
  up: 'ArrowUp',
  down: 'ArrowDown',
  left: 'ArrowLeft',
  right: 'ArrowRight',
  tab: 'Tab',
  backspace: 'Backspace',
  delete: 'Delete',
  del: 'Delete',
}

/**
 * 使用键盘快捷键
 */
export function useKeyboard(shortcuts: KeyboardShortcut[] | Ref<KeyboardShortcut[]>) {
  const shortcutMap = new Map<string, KeyboardShortcut>()

  /**
   * 解析快捷键字符串
   */
  function parseShortcut(key: string): {
    modifiers: Set<keyof typeof MODIFIER_KEYS>
    key: string
  } {
    const parts = key.toLowerCase().split('+').map(s => s.trim())
    const modifiers = new Set<keyof typeof MODIFIER_KEYS>()
    let mainKey = ''

    for (const part of parts) {
      if (part in MODIFIER_KEYS) {
        modifiers.add(part as keyof typeof MODIFIER_KEYS)
      } else {
        mainKey = SPECIAL_KEYS[part] || part
      }
    }

    return { modifiers, key: mainKey }
  }

  /**
   * 检查事件是否匹配快捷键
   */
  function matchesShortcut(
    event: KeyboardEvent,
    modifiers: Set<keyof typeof MODIFIER_KEYS>,
    key: string,
  ): boolean {
    // 检查主键
    const eventKey = event.key.toLowerCase()
    const targetKey = key.toLowerCase()
    
    if (eventKey !== targetKey) {
      return false
    }

    // 检查修饰键
    for (const modifier of modifiers) {
      const modifierKey = MODIFIER_KEYS[modifier]
      if (!event[modifierKey]) {
        return false
      }
    }

    // 确保没有多余的修饰键
    const hasCtrl = event.ctrlKey || event.metaKey
    const hasShift = event.shiftKey
    const hasAlt = event.altKey

    const expectCtrl = modifiers.has('ctrl') || modifiers.has('cmd') || modifiers.has('meta')
    const expectShift = modifiers.has('shift')
    const expectAlt = modifiers.has('alt')

    return hasCtrl === expectCtrl && hasShift === expectShift && hasAlt === expectAlt
  }

  /**
   * 检查是否在输入元素中
   */
  function isInInputElement(event: KeyboardEvent): boolean {
    const target = event.target as HTMLElement
    const tagName = target.tagName.toLowerCase()
    return (
      tagName === 'input' ||
      tagName === 'textarea' ||
      tagName === 'select' ||
      target.isContentEditable
    )
  }

  /**
   * 处理键盘事件
   */
  function handleKeyDown(event: KeyboardEvent): void {
    const shortcutList = Array.isArray(shortcuts) ? shortcuts : shortcuts.value

    for (const shortcut of shortcutList) {
      const { modifiers, key } = parseShortcut(shortcut.key)

      if (matchesShortcut(event, modifiers, key)) {
        // 检查是否在输入框中
        if (!shortcut.allowInInput && isInInputElement(event)) {
          continue
        }

        // 阻止默认行为
        if (shortcut.preventDefault !== false) {
          event.preventDefault()
        }

        // 停止传播
        if (shortcut.stopPropagation) {
          event.stopPropagation()
        }

        // 执行回调
        shortcut.handler(event)
        break
      }
    }
  }

  /**
   * 注册快捷键
   */
  function register(shortcut: KeyboardShortcut): () => void {
    shortcutMap.set(shortcut.key, shortcut)

    return () => {
      shortcutMap.delete(shortcut.key)
    }
  }

  /**
   * 注销快捷键
   */
  function unregister(key: string): void {
    shortcutMap.delete(key)
  }

  /**
   * 获取所有快捷键
   */
  function getShortcuts(): KeyboardShortcut[] {
    return Array.from(shortcutMap.values())
  }

  // 挂载时注册事件监听
  onMounted(() => {
    window.addEventListener('keydown', handleKeyDown)
  })

  // 卸载时清理
  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeyDown)
    shortcutMap.clear()
  })

  return {
    register,
    unregister,
    getShortcuts,
  }
}

/**
 * 常用快捷键预设
 */
export const COMMON_SHORTCUTS = {
  // 导航
  UP: 'ArrowUp',
  DOWN: 'ArrowDown',
  LEFT: 'ArrowLeft',
  RIGHT: 'ArrowRight',
  HOME: 'Home',
  END: 'End',
  PAGE_UP: 'PageUp',
  PAGE_DOWN: 'PageDown',

  // 编辑
  ENTER: 'Enter',
  ESCAPE: 'Escape',
  BACKSPACE: 'Backspace',
  DELETE: 'Delete',
  TAB: 'Tab',

  // 常用组合
  SAVE: 'Ctrl+S',
  UNDO: 'Ctrl+Z',
  REDO: 'Ctrl+Y',
  COPY: 'Ctrl+C',
  CUT: 'Ctrl+X',
  PASTE: 'Ctrl+V',
  SELECT_ALL: 'Ctrl+A',
  FIND: 'Ctrl+F',
  NEW: 'Ctrl+N',
  OPEN: 'Ctrl+O',
  CLOSE: 'Ctrl+W',
  REFRESH: 'Ctrl+R',

  // Mac 特定
  SAVE_MAC: 'Cmd+S',
  UNDO_MAC: 'Cmd+Z',
  REDO_MAC: 'Cmd+Y',
  COPY_MAC: 'Cmd+C',
  CUT_MAC: 'Cmd+X',
  PASTE_MAC: 'Cmd+V',
  SELECT_ALL_MAC: 'Cmd+A',
  FIND_MAC: 'Cmd+F',
  NEW_MAC: 'Cmd+N',
  OPEN_MAC: 'Cmd+O',
  CLOSE_MAC: 'Cmd+W',
  REFRESH_MAC: 'Cmd+R',
} as const

/**
 * 检测是否为 Mac 系统
 */
export function isMac(): boolean {
  return typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.platform)
}

/**
 * 获取平台相关的快捷键
 */
export function getPlatformShortcut(key: string): string {
  const mac = isMac()
  const shortcutKey = key.toUpperCase().replace(/[^A-Z_]/g, '_')
  
  if (mac && shortcutKey in COMMON_SHORTCUTS) {
    const macKey = `${shortcutKey}_MAC` as keyof typeof COMMON_SHORTCUTS
    if (macKey in COMMON_SHORTCUTS) {
      return COMMON_SHORTCUTS[macKey]
    }
  }
  
  return COMMON_SHORTCUTS[shortcutKey as keyof typeof COMMON_SHORTCUTS] || key
}

/**
 * 格式化快捷键显示文本
 */
export function formatShortcut(key: string): string {
  const mac = isMac()
  
  return key
    .split('+')
    .map(part => {
      const lower = part.toLowerCase().trim()
      
      if (lower === 'ctrl' || lower === 'control') {
        return mac ? '⌃' : 'Ctrl'
      }
      if (lower === 'cmd' || lower === 'command' || lower === 'meta') {
        return mac ? '⌘' : 'Ctrl'
      }
      if (lower === 'shift') {
        return mac ? '⇧' : 'Shift'
      }
      if (lower === 'alt' || lower === 'option') {
        return mac ? '⌥' : 'Alt'
      }
      
      return part.charAt(0).toUpperCase() + part.slice(1)
    })
    .join(mac ? '' : '+')
}