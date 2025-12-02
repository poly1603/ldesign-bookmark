import { defineConfig } from '@ldesign/builder'

/**
 * @ldesign/bookmark-vue 构建配置
 *
 * 书签系统 Vue 3 适配器
 */
export default defineConfig({
  // 入口文件
  input: 'src/index.ts',

  // 输出配置
  output: {
    esm: {
      dir: 'es',
      sourcemap: true,
    },
    cjs: {
      dir: 'lib',
      sourcemap: true,
    },
    umd: {
      enabled: false,
    },
  },

  // 外部依赖
  external: [
    'vue',
    '@ldesign/bookmark-core',
  ],

  // 全局变量映射
  globals: {
    'vue': 'Vue',
    '@ldesign/bookmark-core': 'LDesignBookmarkCore',
  },

  // 库类型
  libraryType: 'vue3',

  // 打包器
  bundler: 'rollup',

  // 类型声明
  dts: {
    enabled: true,
  },
})

