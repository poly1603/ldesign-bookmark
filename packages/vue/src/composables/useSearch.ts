/**
 * 搜索功能 Composable
 * 提供书签搜索和过滤功能
 * @module composables/useSearch
 */

import { computed, ref, watch, type Ref } from 'vue'
import type { BookmarkItem } from '@ldesign/bookmark-core'
/**
 * 防抖函数
 */
function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number,
): (...args: Parameters<T>) => void {
  let timer: NodeJS.Timeout | undefined

  return function (this: any, ...args: Parameters<T>) {
    if (timer) {
      clearTimeout(timer)
    }
    timer = setTimeout(() => {
      fn.apply(this, args)
    }, delay)
  }
}

/**
 * 搜索配置
 */
export interface SearchOptions {
  /** 搜索延迟（ms），用于防抖 */
  delay?: number
  /** 是否区分大小写 */
  caseSensitive?: boolean
  /** 是否使用正则表达式 */
  useRegex?: boolean
  /** 搜索字段 */
  fields?: Array<keyof BookmarkItem>
  /** 最小搜索长度 */
  minLength?: number
  /** 是否高亮匹配结果 */
  highlight?: boolean
}

/**
 * 搜索结果
 */
export interface SearchResult {
  /** 匹配的书签项 */
  item: BookmarkItem
  /** 匹配的字段 */
  matchedFields: string[]
  /** 匹配的文本片段 */
  matches: Array<{
    field: string
    text: string
    start: number
    end: number
  }>
  /** 匹配得分（相关性） */
  score: number
}

/**
 * 使用搜索功能
 */
export function useSearch(
  items: Ref<BookmarkItem[]>,
  options: SearchOptions = {},
) {
  const {
    delay = 300,
    caseSensitive = false,
    useRegex = false,
    fields = ['title', 'url', 'description'],
    minLength = 1,
    highlight = true,
  } = options

  // 搜索关键词
  const keyword = ref('')
  
  // 搜索结果
  const results = ref<SearchResult[]>([])
  
  // 是否正在搜索
  const isSearching = ref(false)
  
  // 搜索历史
  const searchHistory = ref<string[]>([])
  
  // 最大历史记录数
  const MAX_HISTORY = 10

  /**
   * 扁平化书签列表（包含子项）
   */
  function flattenItems(bookmarks: BookmarkItem[]): BookmarkItem[] {
    const result: BookmarkItem[] = []
    
    function traverse(items: BookmarkItem[]) {
      for (const item of items) {
        result.push(item)
        if (item.type === 'folder' && item.children) {
          traverse(item.children)
        }
      }
    }
    
    traverse(bookmarks)
    return result
  }

  /**
   * 执行搜索
   */
  function performSearch(query: string): SearchResult[] {
    if (!query || query.length < minLength) {
      return []
    }

    const flatItems = flattenItems(items.value)
    const searchResults: SearchResult[] = []

    // 构建搜索模式
    let pattern: RegExp
    try {
      if (useRegex) {
        pattern = new RegExp(query, caseSensitive ? 'g' : 'gi')
      } else {
        const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        pattern = new RegExp(escaped, caseSensitive ? 'g' : 'gi')
      }
    } catch {
      // 正则表达式无效，使用字符串匹配
      pattern = new RegExp(
        query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
        caseSensitive ? 'g' : 'gi',
      )
    }

    for (const item of flatItems) {
      const matchedFields: string[] = []
      const matches: SearchResult['matches'] = []
      let score = 0

      for (const field of fields) {
        const value = item[field as keyof BookmarkItem]
        if (typeof value !== 'string') continue

        const fieldMatches = Array.from(value.matchAll(pattern))
        if (fieldMatches.length > 0) {
          matchedFields.push(field as string)
          
          for (const match of fieldMatches) {
            matches.push({
              field: field as string,
              text: match[0],
              start: match.index || 0,
              end: (match.index || 0) + match[0].length,
            })
            
            // 计算得分
            if (field === 'title') {
              score += 10 // 标题匹配权重最高
            } else if (field === 'url') {
              score += 5
            } else {
              score += 2
            }
            
            // 完全匹配额外加分
            if (value.toLowerCase() === query.toLowerCase()) {
              score += 20
            }
          }
        }
      }

      if (matchedFields.length > 0) {
        searchResults.push({
          item,
          matchedFields,
          matches,
          score,
        })
      }
    }

    // 按得分排序
    return searchResults.sort((a, b) => b.score - a.score)
  }

  /**
   * 搜索（带防抖）
   */
  const search = debounce((query: string) => {
    isSearching.value = true
    
    try {
      results.value = performSearch(query)
      
      // 添加到搜索历史
      if (query && !searchHistory.value.includes(query)) {
        searchHistory.value.unshift(query)
        if (searchHistory.value.length > MAX_HISTORY) {
          searchHistory.value.pop()
        }
      }
    } finally {
      isSearching.value = false
    }
  }, delay)

  /**
   * 高亮匹配文本
   */
  function highlightText(text: string, query: string): string {
    if (!highlight || !query) {
      return text
    }

    try {
      const pattern = new RegExp(
        query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
        caseSensitive ? 'g' : 'gi',
      )
      
      return text.replace(pattern, match => `<mark>${match}</mark>`)
    } catch {
      return text
    }
  }

  /**
   * 清除搜索
   */
  function clearSearch(): void {
    keyword.value = ''
    results.value = []
  }

  /**
   * 清除历史
   */
  function clearHistory(): void {
    searchHistory.value = []
  }

  /**
   * 删除历史项
   */
  function removeHistory(query: string): void {
    const index = searchHistory.value.indexOf(query)
    if (index > -1) {
      searchHistory.value.splice(index, 1)
    }
  }

  // 监听关键词变化
  watch(keyword, (newKeyword) => {
    if (newKeyword) {
      search(newKeyword)
    } else {
      results.value = []
      isSearching.value = false
    }
  })

  // 计算属性
  const hasResults = computed(() => results.value.length > 0)
  const resultCount = computed(() => results.value.length)
  const isEmpty = computed(() => keyword.value.length > 0 && results.value.length === 0)

  return {
    // 状态
    keyword,
    results,
    isSearching,
    searchHistory,
    
    // 计算属性
    hasResults,
    resultCount,
    isEmpty,
    
    // 方法
    search: (query: string) => {
      keyword.value = query
    },
    clearSearch,
    clearHistory,
    removeHistory,
    highlightText,
  }
}

/**
 * 过滤书签
 */
export function useFilter(items: Ref<BookmarkItem[]>) {
  // 过滤条件
  const filters = ref<{
    type?: BookmarkItem['type']
    pinned?: boolean
    hidden?: boolean
    tags?: string[]
  }>({})

  /**
   * 应用过滤
   */
  const filteredItems = computed(() => {
    let result = items.value

    // 按类型过滤
    if (filters.value.type) {
      result = result.filter(item => item.type === filters.value.type)
    }

    // 按置顶状态过滤
    if (filters.value.pinned !== undefined) {
      result = result.filter(item => 
        'pinned' in item && item.pinned === filters.value.pinned
      )
    }

    // 按隐藏状态过滤
    if (filters.value.hidden !== undefined) {
      result = result.filter(item =>
        'hidden' in item && item.hidden === filters.value.hidden
      )
    }

    // 按标签过滤
    if (filters.value.tags && filters.value.tags.length > 0) {
      result = result.filter(item => {
        if (!('tags' in item) || !Array.isArray(item.tags)) {
          return false
        }
        return filters.value.tags!.some(tag => item.tags!.includes(tag))
      })
    }

    return result
  })

  /**
   * 设置过滤条件
   */
  function setFilter<K extends keyof typeof filters.value>(
    key: K,
    value: typeof filters.value[K],
  ): void {
    filters.value[key] = value
  }

  /**
   * 清除过滤
   */
  function clearFilters(): void {
    filters.value = {}
  }

  /**
   * 重置特定过滤
   */
  function resetFilter(key: keyof typeof filters.value): void {
    delete filters.value[key]
  }

  return {
    filters,
    filteredItems,
    setFilter,
    clearFilters,
    resetFilter,
  }
}