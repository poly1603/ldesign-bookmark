/**
 * 事件发射器
 * 支持防抖、节流和优先级队列
 * @module utils/event-emitter
 */
/**
 * 事件处理函数类型
 */
export type EventHandler<T = unknown> = (data: T) => void;
/**
 * 事件处理器配置
 */
export interface EventHandlerOptions {
    /** 是否只触发一次 */
    once?: boolean;
    /** 防抖延迟（毫秒） */
    debounce?: number;
    /** 节流延迟（毫秒） */
    throttle?: number;
    /** 优先级（数字越大优先级越高） */
    priority?: number;
}
/**
 * 事件发射器类
 * 提供类型安全的事件订阅和发布功能，支持防抖、节流和优先级
 */
export declare class EventEmitter<EventMap extends {
    [K in keyof EventMap]: unknown;
}> {
    /** 事件处理器映射 */
    private handlers;
    /**
     * 订阅事件
     * @param event - 事件名称
     * @param handler - 事件处理函数
     * @param options - 处理器配置
     * @returns 取消订阅函数
     */
    on<K extends keyof EventMap>(event: K, handler: EventHandler<EventMap[K]>, options?: EventHandlerOptions): () => void;
    /**
     * 订阅事件（仅触发一次）
     * @param event - 事件名称
     * @param handler - 事件处理函数
     * @param options - 处理器配置
     * @returns 取消订阅函数
     */
    once<K extends keyof EventMap>(event: K, handler: EventHandler<EventMap[K]>, options?: EventHandlerOptions): () => void;
    /**
     * 取消订阅事件
     * @param event - 事件名称
     * @param handler - 事件处理函数（可选，不传则取消该事件所有订阅）
     */
    off<K extends keyof EventMap>(event: K, handler?: EventHandler<EventMap[K]>): void;
    /**
     * 发布事件
     * @param event - 事件名称
     * @param data - 事件数据
     */
    emit<K extends keyof EventMap>(event: K, data: EventMap[K]): void;
    /**
     * 执行事件处理器
     */
    private executeHandler;
    /**
     * 调用处理器
     */
    private callHandler;
    /**
     * 清除所有事件订阅
     */
    clear(): void;
    /**
     * 获取事件订阅数量
     * @param event - 事件名称（可选，不传则返回所有事件订阅数量）
     * @returns 订阅数量
     */
    listenerCount(event?: keyof EventMap): number;
    /**
     * 获取所有事件名称
     * @returns 事件名称数组
     */
    eventNames(): Array<keyof EventMap>;
}
/**
 * 创建防抖函数
 * @param fn - 要防抖的函数
 * @param delay - 延迟时间（毫秒）
 * @returns 防抖后的函数
 */
export declare function debounce<T extends (...args: any[]) => any>(fn: T, delay: number): (...args: Parameters<T>) => void;
/**
 * 创建节流函数
 * @param fn - 要节流的函数
 * @param delay - 延迟时间（毫秒）
 * @returns 节流后的函数
 */
export declare function throttle<T extends (...args: any[]) => any>(fn: T, delay: number): (...args: Parameters<T>) => void;
