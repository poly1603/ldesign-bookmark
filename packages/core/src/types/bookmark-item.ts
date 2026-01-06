/**
 * 书签项类型定义
 * @module types/bookmark-item
 * @description 定义书签系统中所有数据结构的 TypeScript 类型
 */

// ==================== 辅助类型 ====================

/**
 * 深度部分类型 - 使对象的所有属性（包括嵌套）变为可选
 * @template T - 要处理的类型
 * @example
 * ```ts
 * type PartialBookmark = DeepPartial<BookmarkItem>
 * ```
 */
export type DeepPartial<T> = T extends object ? {
  [P in keyof T]?: DeepPartial<T[P]>
} : T

/**
 * 深度只读类型 - 使对象的所有属性（包括嵌套）变为只读
 * @template T - 要处理的类型
 */
export type DeepReadonly<T> = T extends object ? {
  readonly [P in keyof T]: DeepReadonly<T[P]>
} : T

/**
 * 必需键类型 - 提取对象中的必需属性键
 * @template T - 要处理的类型
 */
export type RequiredKeys<T> = {
  [K in keyof T]-?: object extends Pick<T, K> ? never : K
}[keyof T]

/**
 * 可选键类型 - 提取对象中的可选属性键
 * @template T - 要处理的类型
 */
export type OptionalKeys<T> = {
  [K in keyof T]-?: object extends Pick<T, K> ? K : never
}[keyof T]

/**
 * 排除属性类型 - 从类型中排除指定属性
 * @template T - 要处理的类型
 * @template K - 要排除的属性键
 */
export type OmitStrict<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>

/**
 * 创建书签时的输入类型 - 排除自动生成的字段
 * @template T - 书签类型
 */
export type BookmarkCreateInput<T extends BookmarkItemBase> = 
  OmitStrict<T, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }

/**
 * 更新书签时的输入类型 - 所有字段可选且排除 id
 * @template T - 书签类型
 */
export type BookmarkUpdateInput<T extends BookmarkItemBase> = 
  Partial<OmitStrict<T, 'id' | 'createdAt'>>

// ==================== 基础类型 ====================

/**
 * 书签项类型
 * @description 定义书签项的三种基本类型
 * - `bookmark`: 普通书签（叶子节点），包含 URL 链接
 * - `folder`: 文件夹（容器节点），可包含子书签项
 * - `separator`: 分隔线，用于视觉分组
 */
export type BookmarkItemType = 'bookmark' | 'folder' | 'separator'

/**
 * 书签目标打开方式
 * @description 定义点击书签时链接的打开方式
 * - `_self`: 当前窗口打开（默认）
 * - `_blank`: 新窗口/标签页打开
 * - `_parent`: 父框架中打开
 * - `_top`: 顶层框架中打开
 */
export type BookmarkTarget = '_self' | '_blank' | '_parent' | '_top'

/**
 * 书签项基础接口
 * @description 所有书签项类型共享的基础属性
 * @interface
 */
export interface BookmarkItemBase {
  /**
   * 书签项唯一标识
   * @description 用于标识书签的唯一 ID，通常使用 UUID 或自增 ID
   * @required
   * @example 'bm_1234567890_abc123'
   */
  id: string

  /**
   * 书签项类型
   * @description 区分书签、文件夹和分隔线
   * @default 'bookmark'
   */
  type?: BookmarkItemType

  /**
   * 书签项显示标题
   * @description 在 UI 中显示的名称
   * @example 'GitHub - 代码托管平台'
   */
  title: string

  /**
   * 书签项图标
   * @description 可以是以下格式：
   * - 完整 URL: 'https://example.com/favicon.ico'
   * - 数据 URI: 'data:image/png;base64,...'
   * - 图标名称: 'folder' | 'bookmark' | 'star'
   * @example 'https://github.com/favicon.ico'
   */
  icon?: string

  /**
   * 是否固定/置顶
   * @description 置顶的书签会显示在列表顶部，不受排序影响
   * @default false
   */
  pinned?: boolean

  /**
   * 是否隐藏
   * @description 隐藏的书签不会在默认列表中显示
   * @default false
   */
  hidden?: boolean

  /**
   * 创建时间戳
   * @description Unix 时间戳（毫秒）
   * @readonly 通常在创建时自动设置
   */
  createdAt?: number

  /**
   * 更新时间戳
   * @description Unix 时间戳（毫秒），每次修改时更新
   * @readonly 通常在更新时自动设置
   */
  updatedAt?: number

  /**
   * 排序索引
   * @description 用于自定义排序，数值越小越靠前
   * @default 0
   */
  sortIndex?: number

  /**
   * 额外数据
   * @description 存储任意自定义数据，用于扩展功能
   * @example { source: 'import', originalId: '123' }
   */
  meta?: Record<string, unknown>
}

// ==================== 书签项类型 ====================

/**
 * 普通书签项（叶子节点）
 * @description 表示一个包含 URL 链接的书签
 * @interface
 * @extends BookmarkItemBase
 */
export interface BookmarkLeafItem extends BookmarkItemBase {
  /**
   * 书签类型
   * @description 普通书签的类型为 'bookmark' 或省略
   */
  type?: 'bookmark'

  /**
   * 书签 URL 地址
   * @description 点击书签时要打开的链接
   * @required
   * @example 'https://github.com'
   */
  url: string

  /**
   * 链接打开方式
   * @description 指定链接在何处打开
   * @default '_self'
   */
  target?: BookmarkTarget

  /**
   * 路由路径
   * @description 用于 Vue Router 等单页应用路由库，替代 URL 跳转
   * @example '/dashboard/settings'
   */
  path?: string

  /**
   * 书签描述
   * @description 帮助用户记忆书签内容的详细描述
   * @example '代码托管与协作平台'
   */
  description?: string

  /**
   * 标签列表
   * @description 用于分类和搜索的标签
   * @example ['development', 'tools', 'git']
   */
  tags?: string[]

  /**
   * 访问次数
   * @description 记录书签被访问的次数，用于排序和统计
   * @default 0
   */
  visitCount?: number

  /**
   * 最后访问时间
   * @description Unix 时间戳（毫秒），记录最后一次点击时间
   */
  lastVisitedAt?: number

  /**
   * favicon URL
   * @description 网站图标的完整 URL，通常自动获取
   * @example 'https://github.com/favicon.ico'
   */
  favicon?: string
}

/**
 * 书签文件夹（容器节点）
 * @description 表示一个可以包含子书签项的文件夹
 * @interface
 * @extends BookmarkItemBase
 */
export interface BookmarkFolderItem extends BookmarkItemBase {
  /**
   * 文件夹类型
   * @description 文件夹的类型必须为 'folder'
   */
  type: 'folder'

  /**
   * 子书签项列表
   * @description 文件夹中包含的书签项，可以嵌套文件夹
   */
  children: BookmarkItem[]

  /**
   * 是否展开
   * @description UI 中文件夹的展开/收起状态
   * @default false
   */
  expanded?: boolean

  /**
   * 文件夹颜色
   * @description 用于视觉区分不同文件夹
   * @example '#1890ff'
   */
  color?: string
}

/**
 * 分隔线项
 * @description 用于在书签列表中创建视觉分组
 * @interface
 */
export interface BookmarkSeparatorItem {
  /**
   * 分隔线类型
   */
  type: 'separator'

  /**
   * 分隔线 ID
   * @description 可选，用于唯一标识
   */
  id?: string
}

// ==================== 联合类型 ====================

/**
 * 书签项联合类型
 * @description 所有书签项类型的联合，使用类型守卫函数进行类型区分
 */
export type BookmarkItem = BookmarkLeafItem | BookmarkFolderItem | BookmarkSeparatorItem

/**
 * 非分隔线的书签项
 * @description 不包含分隔线的书签项类型
 */
export type BookmarkItemWithId = BookmarkLeafItem | BookmarkFolderItem

// ==================== 辅助接口 ====================

/**
 * 书签项路径信息
 * @description 描述一个书签项在树形结构中的完整路径
 * @interface
 */
export interface BookmarkItemPath {
  /**
   * 路径上的所有 ID
   * @description 从根到目标项的所有节点 ID
   * @example ['root', 'folder1', 'bookmark1']
   */
  ids: string[]

  /**
   * 路径上的所有书签项
   * @description 从根到目标项的所有节点对象
   */
  items: BookmarkItem[]
}

/**
 * 扁平化的书签项
 * @description 将树形结构的书签扁平化后的单个项，包含层级和路径信息
 * @interface
 */
export interface FlatBookmarkItem {
  /**
   * 书签项对象
   */
  item: BookmarkItem

  /**
   * 层级深度
   * @description 从 0 开始，根级为 0
   */
  level: number

  /**
   * 父级 ID
   * @description 根级项没有父级
   */
  parentId?: string

  /**
   * 路径 ID 数组
   * @description 从根到当前项的所有 ID
   */
  path: string[]
}

/**
 * 书签排序字段
 * @description 可用于排序的字段名称
 */
export type BookmarkSortField = 'title' | 'createdAt' | 'updatedAt' | 'visitCount' | 'sortIndex'

/**
 * 排序方向
 */
export type SortDirection = 'asc' | 'desc'

/**
 * 书签排序选项
 * @interface
 */
export interface BookmarkSortOptions {
  /**
   * 排序字段
   */
  field: BookmarkSortField

  /**
   * 排序方向
   * @default 'asc'
   */
  direction?: SortDirection

  /**
   * 文件夹是否置顶
   * @default true
   */
  foldersFirst?: boolean

  /**
   * 置顶项是否始终在前
   * @default true
   */
  pinnedFirst?: boolean
}

