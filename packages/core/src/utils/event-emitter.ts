/**
 * 事件发射器
 * 支持防抖、节流和优先级队列
 * @module utils/event-emitter
 */

/**
 * 事件处理函数类型
 */
export type EventHandler<T = unknown> = (data: T) => void

/**
 * 事件处理器配置
 */
export interface EventHandlerOptions {
  /** 是否只触发一次 */
  once?: boolean
  /** 防抖延迟（毫秒） */
  debounce?: number
  /** 节流延迟（毫秒） */
  throttle?: number
  /** 优先级（数字越大优先级越高） */
  priority?: number
}

/**
 * 内部事件处理器包装
 */
interface EventHandlerWrapper<T> {
  handler: EventHandler<T>
  options: EventHandlerOptions
  timer?: NodeJS.Timeout
  lastCall?: number
}

/**
 * 事件发射器类
 * 提供类型安全的事件订阅和发布功能，支持防抖、节流和优先级
 */
export class EventEmitter<EventMap extends { [K in keyof EventMap]: unknown }> {
  /** 事件处理器映射 */
  private handlers = new Map<keyof EventMap, Set<EventHandlerWrapper<unknown>>>()

  /**
   * 订阅事件
   * @param event - 事件名称
   * @param handler - 事件处理函数
   * @param options - 处理器配置
   * @returns 取消订阅函数
   */
  on<K extends keyof EventMap>(
    event: K,
    handler: EventHandler<EventMap[K]>,
    options: EventHandlerOptions = {},
  ): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set())
    }

    const handlers = this.handlers.get(event)!
    const wrapper: EventHandlerWrapper<EventMap[K]> = {
      handler: handler as EventHandler<unknown>,
      options,
    }

    handlers.add(wrapper as EventHandlerWrapper<unknown>)

    // 返回取消订阅函数
    return () => {
      if (wrapper.timer) {
        clearTimeout(wrapper.timer)
      }
      handlers.delete(wrapper as EventHandlerWrapper<unknown>)
      if (handlers.size === 0) {
        this.handlers.delete(event)
      }
    }
  }

  /**
   * 订阅事件（仅触发一次）
   * @param event - 事件名称
   * @param handler - 事件处理函数
   * @param options - 处理器配置
   * @returns 取消订阅函数
   */
  once<K extends keyof EventMap>(
    event: K,
    handler: EventHandler<EventMap[K]>,
    options: EventHandlerOptions = {},
  ): () => void {
    return this.on(event, handler, { ...options, once: true })
  }

  /**
   * 取消订阅事件
   * @param event - 事件名称
   * @param handler - 事件处理函数（可选，不传则取消该事件所有订阅）
   */
  off<K extends keyof EventMap>(
    event: K,
    handler?: EventHandler<EventMap[K]>,
  ): void {
    if (!handler) {
      const wrappers = this.handlers.get(event)
      if (wrappers) {
        // 清理所有定时器
        wrappers.forEach((wrapper) => {
          if (wrapper.timer) {
            clearTimeout(wrapper.timer)
          }
        })
      }
      this.handlers.delete(event)
      return
    }

    const handlers = this.handlers.get(event)
    if (handlers) {
      handlers.forEach((wrapper) => {
        if (wrapper.handler === handler) {
          if (wrapper.timer) {
            clearTimeout(wrapper.timer)
          }
          handlers.delete(wrapper)
        }
      })
      if (handlers.size === 0) {
        this.handlers.delete(event)
      }
    }
  }

  /**
   * 发布事件
   * @param event - 事件名称
   * @param data - 事件数据
   */
  emit<K extends keyof EventMap>(event: K, data: EventMap[K]): void {
    const handlers = this.handlers.get(event)
    if (!handlers || handlers.size === 0) {
      return
    }

    // 按优先级排序
    const sortedHandlers = Array.from(handlers).sort((a, b) => {
      const priorityA = a.options.priority ?? 0
      const priorityB = b.options.priority ?? 0
      return priorityB - priorityA
    })

    sortedHandlers.forEach((wrapper) => {
      this.executeHandler(wrapper, data, event, handlers)
    })
  }

  /**
   * 执行事件处理器
   */
  private executeHandler<K extends keyof EventMap>(
    wrapper: EventHandlerWrapper<unknown>,
    data: EventMap[K],
    event: K,
    handlers: Set<EventHandlerWrapper<unknown>>,
  ): void {
    const { handler, options } = wrapper

    // 防抖处理
    if (options.debounce) {
      if (wrapper.timer) {
        clearTimeout(wrapper.timer)
      }
      wrapper.timer = setTimeout(() => {
        this.callHandler(handler, data, event, wrapper, handlers)
      }, options.debounce)
      return
    }

    // 节流处理
    if (options.throttle) {
      const now = Date.now()
      if (wrapper.lastCall && now - wrapper.lastCall < options.throttle) {
        return
      }
      wrapper.lastCall = now
    }

    // 立即执行
    this.callHandler(handler, data, event, wrapper, handlers)
  }

  /**
   * 调用处理器
   */
  private callHandler<K extends keyof EventMap>(
    handler: EventHandler<unknown>,
    data: EventMap[K],
    event: K,
    wrapper: EventHandlerWrapper<unknown>,
    handlers: Set<EventHandlerWrapper<unknown>>,
  ): void {
    try {
      handler(data)

      // 如果是 once，执行后删除
      if (wrapper.options.once) {
        if (wrapper.timer) {
          clearTimeout(wrapper.timer)
        }
        handlers.delete(wrapper)
        if (handlers.size === 0) {
          this.handlers.delete(event)
        }
      }
    }
    catch (error) {
      console.error(`[BookmarkEventEmitter] Error in event handler for "${String(event)}":`, error)
    }
  }

  /**
   * 清除所有事件订阅
   */
  clear(): void {
    // 清理所有定时器
    this.handlers.forEach((handlers) => {
      handlers.forEach((wrapper) => {
        if (wrapper.timer) {
          clearTimeout(wrapper.timer)
        }
      })
    })
    this.handlers.clear()
  }

  /**
   * 获取事件订阅数量
   * @param event - 事件名称（可选，不传则返回所有事件订阅数量）
   * @returns 订阅数量
   */
  listenerCount(event?: keyof EventMap): number {
    if (event !== undefined) {
      return this.handlers.get(event)?.size ?? 0
    }

    let count = 0
    this.handlers.forEach((handlers) => {
      count += handlers.size
    })
    return count
  }

  /**
   * 获取所有事件名称
   * @returns 事件名称数组
   */
  eventNames(): Array<keyof EventMap> {
    return Array.from(this.handlers.keys())
  }
}

/**
 * 创建防抖函数
 * @param fn - 要防抖的函数
 * @param delay - 延迟时间（毫秒）
 * @returns 防抖后的函数
 */
export function debounce<T extends (...args: any[]) => any>(
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
 * 创建节流函数
 * @param fn - 要节流的函数
 * @param delay - 延迟时间（毫秒）
 * @returns 节流后的函数
 */
export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  delay: number,
): (...args: Parameters<T>) => void {
  let lastCall = 0

  return function (this: any, ...args: Parameters<T>) {
    const now = Date.now()
    if (now - lastCall >= delay) {
      lastCall = now
      fn.apply(this, args)
    }
  }
}
