<script setup lang="ts">
/**
 * 书签搜索组件
 * 提供快速搜索和过滤书签的功能
 *
 * @example
 * ```vue
 * <BookmarkSearch
 *   :items="bookmarks"
 *   placeholder="搜索书签..."
 *   @select="handleSelect"
 * />
 * ```
 */
import type { BookmarkItem as BookmarkItemType, BookmarkLeafItem } from '@ldesign/bookmark-core'
import { isFolder, isBookmark } from '@ldesign/bookmark-core'
import { computed, ref, watch, nextTick, onMounted, onUnmounted } from 'vue'

/**
 * 搜索结果项
 */
interface SearchResultItem {
  item: BookmarkItemType
  score: number
  matchedField: 'title' | 'url' | 'tags'
  path: string[]
}

/**
 * 组件属性
 */
interface Props {
  /** 书签列表 */
  items?: BookmarkItemType[]
  /** 占位符文本 */
  placeholder?: string
  /** 是否自动聚焦 */
  autofocus?: boolean
  /** 最大结果数 */
  maxResults?: number
  /** 搜索防抖延迟（ms） */
  debounce?: number
  /** 最小搜索字符数 */
  minChars?: number
  /** 是否显示路径 */
  showPath?: boolean
  /** 是否显示快捷键提示 */
  showShortcut?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  items: () => [],
  placeholder: '搜索书签...',
  autofocus: false,
  maxResults: 20,
  debounce: 150,
  minChars: 1,
  showPath: true,
  showShortcut: true,
})

/**
 * 组件事件
 */
const emit = defineEmits<{
  /** 选中搜索结果 */
  select: [item: BookmarkItemType, event: Event]
  /** 搜索内容变化 */
  'update:query': [query: string]
  /** 关闭搜索 */
  close: []
}>()

// 状态
const inputRef = ref<HTMLInputElement | null>(null)
const query = ref('')
const isOpen = ref(false)
const activeIndex = ref(-1)
let debounceTimer: ReturnType<typeof setTimeout> | null = null

/**
 * 扁平化搜索书签
 */
function flattenAndSearch(
  items: BookmarkItemType[],
  searchQuery: string,
  path: string[] = [],
): SearchResultItem[] {
  const results: SearchResultItem[] = []
  const lowerQuery = searchQuery.toLowerCase()

  for (const item of items) {
    const currentPath = 'title' in item ? [...path, item.title] : path

    // 搜索标题
    if ('title' in item && item.title.toLowerCase().includes(lowerQuery)) {
      results.push({
        item,
        score: item.title.toLowerCase().startsWith(lowerQuery) ? 2 : 1,
        matchedField: 'title',
        path: currentPath.slice(0, -1),
      })
    }

    // 搜索 URL
    if (isBookmark(item) && item.url?.toLowerCase().includes(lowerQuery)) {
      const existing = results.find(r => r.item === item)
      if (!existing) {
        results.push({
          item,
          score: 0.8,
          matchedField: 'url',
          path: currentPath.slice(0, -1),
        })
      }
    }

    // 搜索标签
    if ('tags' in item && Array.isArray((item as BookmarkLeafItem).tags)) {
      const tags = (item as BookmarkLeafItem).tags!
      const matchedTag = tags.find(tag => tag.toLowerCase().includes(lowerQuery))
      if (matchedTag) {
        const existing = results.find(r => r.item === item)
        if (!existing) {
          results.push({
            item,
            score: 0.6,
            matchedField: 'tags',
            path: currentPath.slice(0, -1),
          })
        }
      }
    }

    // 递归搜索文件夹
    if (isFolder(item)) {
      results.push(...flattenAndSearch(item.children, searchQuery, currentPath))
    }
  }

  return results
}

/**
 * 搜索结果
 */
const searchResults = computed<SearchResultItem[]>(() => {
  if (query.value.length < props.minChars) {
    return []
  }

  const results = flattenAndSearch(props.items, query.value)
  
  // 按分数排序
  results.sort((a, b) => b.score - a.score)
  
  return results.slice(0, props.maxResults)
})

/**
 * 处理输入
 */
function handleInput(event: Event): void {
  const target = event.target as HTMLInputElement
  const value = target.value

  if (debounceTimer) {
    clearTimeout(debounceTimer)
  }

  debounceTimer = setTimeout(() => {
    query.value = value
    isOpen.value = value.length >= props.minChars
    activeIndex.value = -1
    emit('update:query', value)
  }, props.debounce)
}

/**
 * 处理键盘事件
 */
function handleKeyDown(event: KeyboardEvent): void {
  const { key } = event
  const resultCount = searchResults.value.length

  switch (key) {
    case 'ArrowDown':
      event.preventDefault()
      if (resultCount > 0) {
        activeIndex.value = (activeIndex.value + 1) % resultCount
        scrollToActive()
      }
      break

    case 'ArrowUp':
      event.preventDefault()
      if (resultCount > 0) {
        activeIndex.value = activeIndex.value <= 0 ? resultCount - 1 : activeIndex.value - 1
        scrollToActive()
      }
      break

    case 'Enter':
      event.preventDefault()
      if (activeIndex.value >= 0 && searchResults.value[activeIndex.value]) {
        selectResult(searchResults.value[activeIndex.value], event)
      }
      break

    case 'Escape':
      event.preventDefault()
      close()
      break
  }
}

/**
 * 滚动到激活项
 */
function scrollToActive(): void {
  nextTick(() => {
    const activeElement = document.querySelector('.l-bookmark-search__result--active')
    activeElement?.scrollIntoView({ block: 'nearest' })
  })
}

/**
 * 选择结果
 */
function selectResult(result: SearchResultItem, event: Event): void {
  emit('select', result.item, event)
  close()
}

/**
 * 关闭搜索
 */
function close(): void {
  isOpen.value = false
  query.value = ''
  activeIndex.value = -1
  if (inputRef.value) {
    inputRef.value.value = ''
  }
  emit('close')
}

/**
 * 聚焦输入框
 */
function focus(): void {
  inputRef.value?.focus()
}

/**
 * 清空搜索
 */
function clear(): void {
  query.value = ''
  activeIndex.value = -1
  if (inputRef.value) {
    inputRef.value.value = ''
    inputRef.value.focus()
  }
}

/**
 * 高亮匹配文本
 */
function highlightMatch(text: string, query: string): string {
  if (!query) return text
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
  return text.replace(regex, '<mark class="l-bookmark-search__highlight">$1</mark>')
}

// 全局快捷键
function handleGlobalKeyDown(event: KeyboardEvent): void {
  // Cmd/Ctrl + K 打开搜索
  if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
    event.preventDefault()
    focus()
  }
}

onMounted(() => {
  if (props.autofocus) {
    focus()
  }
  if (props.showShortcut) {
    document.addEventListener('keydown', handleGlobalKeyDown)
  }
})

onUnmounted(() => {
  if (debounceTimer) {
    clearTimeout(debounceTimer)
  }
  if (props.showShortcut) {
    document.removeEventListener('keydown', handleGlobalKeyDown)
  }
})

// 暴露方法
defineExpose({
  /** 聚焦输入框 */
  focus,
  /** 清空搜索 */
  clear,
  /** 关闭搜索 */
  close,
})
</script>

<template>
  <div class="l-bookmark-search">
    <!-- 搜索输入框 -->
    <div class="l-bookmark-search__input-wrapper">
      <span class="l-bookmark-search__icon">
        <svg viewBox="0 0 24 24" width="16" height="16">
          <path
            fill="currentColor"
            d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"
          />
        </svg>
      </span>
      <input
        ref="inputRef"
        type="text"
        class="l-bookmark-search__input"
        :placeholder="placeholder"
        @input="handleInput"
        @keydown="handleKeyDown"
        @focus="isOpen = query.length >= minChars"
      />
      <span v-if="query" class="l-bookmark-search__clear" @click="clear">
        <svg viewBox="0 0 24 24" width="16" height="16">
          <path
            fill="currentColor"
            d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
          />
        </svg>
      </span>
      <span v-if="showShortcut && !query" class="l-bookmark-search__shortcut">
        ⌘K
      </span>
    </div>

    <!-- 搜索结果 -->
    <Teleport to="body">
      <div
        v-if="isOpen && searchResults.length > 0"
        class="l-bookmark-search__dropdown"
      >
        <ul class="l-bookmark-search__results" role="listbox">
          <li
            v-for="(result, index) in searchResults"
            :key="'id' in result.item ? result.item.id : index"
            class="l-bookmark-search__result"
            :class="{ 'l-bookmark-search__result--active': index === activeIndex }"
            role="option"
            :aria-selected="index === activeIndex"
            @click="selectResult(result, $event)"
            @mouseenter="activeIndex = index"
          >
            <!-- 图标 -->
            <span class="l-bookmark-search__result-icon">
              {{ isFolder(result.item) ? '📁' : '🔖' }}
            </span>

            <!-- 内容 -->
            <div class="l-bookmark-search__result-content">
              <!-- 标题 -->
              <span
                class="l-bookmark-search__result-title"
                v-html="highlightMatch('title' in result.item ? result.item.title : '', query)"
              />

              <!-- 路径 -->
              <span v-if="showPath && result.path.length > 0" class="l-bookmark-search__result-path">
                {{ result.path.join(' / ') }}
              </span>

              <!-- URL -->
              <span
                v-if="isBookmark(result.item)"
                class="l-bookmark-search__result-url"
                v-html="highlightMatch(result.item.url || '', query)"
              />
            </div>

            <!-- 匹配类型 -->
            <span class="l-bookmark-search__result-badge">
              {{ result.matchedField === 'title' ? '标题' : result.matchedField === 'url' ? 'URL' : '标签' }}
            </span>
          </li>
        </ul>
      </div>
    </Teleport>

    <!-- 无结果 -->
    <Teleport to="body">
      <div
        v-if="isOpen && query.length >= minChars && searchResults.length === 0"
        class="l-bookmark-search__dropdown l-bookmark-search__empty"
      >
        <slot name="empty">
          <span class="l-bookmark-search__empty-text">未找到匹配的书签</span>
        </slot>
      </div>
    </Teleport>
  </div>
</template>

<style>
.l-bookmark-search {
  position: relative;
  width: 100%;
}

.l-bookmark-search__input-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--l-bookmark-search-bg, #f5f5f5);
  border: 1px solid var(--l-bookmark-search-border, #e0e0e0);
  border-radius: 8px;
  transition: all 0.2s ease;
}

.l-bookmark-search__input-wrapper:focus-within {
  background: var(--l-bookmark-search-bg-focus, #fff);
  border-color: var(--l-bookmark-search-border-focus, #2196f3);
  box-shadow: 0 0 0 3px var(--l-bookmark-search-shadow, rgba(33, 150, 243, 0.1));
}

.l-bookmark-search__icon {
  flex-shrink: 0;
  color: var(--l-bookmark-search-icon-color, #999);
}

.l-bookmark-search__input {
  flex: 1;
  border: none;
  background: transparent;
  outline: none;
  font-size: 14px;
  color: var(--l-bookmark-search-text-color, #333);
}

.l-bookmark-search__input::placeholder {
  color: var(--l-bookmark-search-placeholder-color, #999);
}

.l-bookmark-search__clear {
  flex-shrink: 0;
  cursor: pointer;
  color: var(--l-bookmark-search-clear-color, #999);
  transition: color 0.2s;
}

.l-bookmark-search__clear:hover {
  color: var(--l-bookmark-search-clear-color-hover, #666);
}

.l-bookmark-search__shortcut {
  flex-shrink: 0;
  padding: 2px 6px;
  font-size: 11px;
  background: var(--l-bookmark-search-shortcut-bg, #e0e0e0);
  color: var(--l-bookmark-search-shortcut-color, #666);
  border-radius: 4px;
}

.l-bookmark-search__dropdown {
  position: fixed;
  z-index: 9999;
  min-width: 300px;
  max-width: 500px;
  max-height: 400px;
  overflow-y: auto;
  background: var(--l-bookmark-search-dropdown-bg, #fff);
  border: 1px solid var(--l-bookmark-search-dropdown-border, #e0e0e0);
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

.l-bookmark-search__results {
  list-style: none;
  margin: 0;
  padding: 4px;
}

.l-bookmark-search__result {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.15s;
}

.l-bookmark-search__result:hover,
.l-bookmark-search__result--active {
  background: var(--l-bookmark-search-result-hover-bg, #f5f5f5);
}

.l-bookmark-search__result-icon {
  flex-shrink: 0;
  font-size: 14px;
}

.l-bookmark-search__result-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.l-bookmark-search__result-title {
  font-size: 14px;
  color: var(--l-bookmark-search-result-title-color, #333);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.l-bookmark-search__result-path {
  font-size: 11px;
  color: var(--l-bookmark-search-result-path-color, #999);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.l-bookmark-search__result-url {
  font-size: 12px;
  color: var(--l-bookmark-search-result-url-color, #666);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.l-bookmark-search__result-badge {
  flex-shrink: 0;
  padding: 2px 6px;
  font-size: 10px;
  background: var(--l-bookmark-search-badge-bg, #e0e0e0);
  color: var(--l-bookmark-search-badge-color, #666);
  border-radius: 4px;
}

.l-bookmark-search__highlight {
  background: var(--l-bookmark-search-highlight-bg, #fff3cd);
  color: inherit;
}

.l-bookmark-search__empty {
  padding: 24px;
  text-align: center;
}

.l-bookmark-search__empty-text {
  color: var(--l-bookmark-search-empty-color, #999);
  font-size: 14px;
}
</style>
