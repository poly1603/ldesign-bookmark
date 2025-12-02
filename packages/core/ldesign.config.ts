import { defineConfig } from '@ldesign/builder'

/**
 * @ldesign/bookmark-core 构建配置
 *
 * 书签系统核心包 - 框架无关
 */
export default defineConfig({
  // 入口文件
  entry: 'src/index.ts',

  // 输出配置
  output: {
    formats: ['esm', 'cjs'],
    esm: {
      dir: 'es',
      preserveStructure: true,
    },
    cjs: {
      dir: 'lib',
      preserveStructure: true,
    },
  },

  // 生成类型声明
  dts: true,

  // 生成 sourcemap
  sourcemap: true,

  // ESM/CJS 不压缩
  minify: false,

  // 构建前清理
  clean: true,

  // 外部依赖
  external: [],
})

