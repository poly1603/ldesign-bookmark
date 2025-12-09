/**
 * 书签项类型定义
 * @module types/bookmark-item
 */
/**
 * 书签项类型
 * - `bookmark`: 普通书签（叶子节点）
 * - `folder`: 文件夹（可包含子项）
 * - `separator`: 分隔线
 */
export type BookmarkItemType = 'bookmark' | 'folder' | 'separator';
/**
 * 书签目标打开方式
 */
export type BookmarkTarget = '_self' | '_blank' | '_parent' | '_top';
/**
 * 书签项基础接口
 */
export interface BookmarkItemBase {
    /**
     * 书签项唯一标识
     * @required
     */
    id: string;
    /**
     * 书签项类型
     * @default 'bookmark'
     */
    type?: BookmarkItemType;
    /**
     * 书签项显示标题
     */
    title: string;
    /**
     * 书签项图标
     * 可以是图标名称字符串、URL 或 favicon
     */
    icon?: string;
    /**
     * 是否固定/置顶
     * @default false
     */
    pinned?: boolean;
    /**
     * 是否隐藏
     * @default false
     */
    hidden?: boolean;
    /**
     * 创建时间戳
     */
    createdAt?: number;
    /**
     * 更新时间戳
     */
    updatedAt?: number;
    /**
     * 排序索引
     */
    sortIndex?: number;
    /**
     * 额外数据
     */
    meta?: Record<string, unknown>;
}
/**
 * 普通书签项（叶子节点）
 */
export interface BookmarkLeafItem extends BookmarkItemBase {
    type?: 'bookmark';
    /**
     * 书签 URL 地址
     */
    url: string;
    /**
     * 链接打开方式
     * @default '_self'
     */
    target?: BookmarkTarget;
    /**
     * 路由路径（用于 Vue Router 等路由库）
     */
    path?: string;
    /**
     * 书签描述
     */
    description?: string;
    /**
     * 标签列表
     */
    tags?: string[];
    /**
     * 访问次数
     */
    visitCount?: number;
    /**
     * 最后访问时间
     */
    lastVisitedAt?: number;
}
/**
 * 书签文件夹（可包含子项）
 */
export interface BookmarkFolderItem extends BookmarkItemBase {
    type: 'folder';
    /**
     * 子书签项列表
     */
    children: BookmarkItem[];
    /**
     * 是否展开
     * @default false
     */
    expanded?: boolean;
}
/**
 * 分隔线
 */
export interface BookmarkSeparatorItem {
    type: 'separator';
    id?: string;
}
/**
 * 书签项联合类型
 */
export type BookmarkItem = BookmarkLeafItem | BookmarkFolderItem | BookmarkSeparatorItem;
/**
 * 书签项路径信息
 */
export interface BookmarkItemPath {
    /**
     * 路径上的所有 id
     */
    ids: string[];
    /**
     * 路径上的所有书签项
     */
    items: BookmarkItem[];
}
/**
 * 扁平化的书签项（包含层级信息）
 */
export interface FlatBookmarkItem {
    /**
     * 书签项
     */
    item: BookmarkItem;
    /**
     * 层级（从 0 开始）
     */
    level: number;
    /**
     * 父级 id
     */
    parentId?: string;
    /**
     * 从根到当前项的路径
     */
    path: string[];
}
