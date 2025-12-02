/**
 * 事件发射器
 * @module utils/event-emitter
 */

/**
 * 事件处理函数类型
 */
export type EventHandler<T = unknown> = (data: T) => void

/**
 * 事件发射器类
 * 提供类型安全的事件订阅和发布功能
 */
export class EventEmitter<EventMap extends { [K in keyof EventMap]: unknown }> {
  /** 事件处理器映射 */
  private handlers = new Map<keyof EventMap, Set<EventHandler<unknown>>>()

  /**
   * 订阅事件
   * @param event - 事件名称
   * @param handler - 事件处理函数
   * @returns 取消订阅函数
   */
  on<K extends keyof EventMap>(
    event: K,
    handler: EventHandler<EventMap[K]>,
  ): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set())
    }

    const handlers = this.handlers.get(event)!
    handlers.add(handler as EventHandler<unknown>)

    // 返回取消订阅函数
    return () => {
      handlers.delete(handler as EventHandler<unknown>)
      if (handlers.size === 0) {
        this.handlers.delete(event)
      }
    }
  }

  /**
   * 订阅事件（仅触发一次）
   * @param event - 事件名称
   * @param handler - 事件处理函数
   * @returns 取消订阅函数
   */
  once<K extends keyof EventMap>(
    event: K,
    handler: EventHandler<EventMap[K]>,
  ): () => void {
    let unsubscribe: (() => void) | undefined
    const wrappedHandler: EventHandler<EventMap[K]> = (data) => {
      unsubscribe?.()
      handler(data)
    }

    unsubscribe = this.on(event, wrappedHandler)
    return unsubscribe
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
      this.handlers.delete(event)
      return
    }

    const handlers = this.handlers.get(event)
    if (handlers) {
      handlers.delete(handler as EventHandler<unknown>)
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
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(data)
        }
        catch (error) {
          console.error(`[BookmarkEventEmitter] Error in event handler for "${String(event)}":`, error)
        }
      })
    }
  }

  /**
   * 清除所有事件订阅
   */
  clear(): void {
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
}

