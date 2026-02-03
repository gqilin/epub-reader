import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'EPUB Reader Core',
  description: '一个框架无关的 TypeScript EPUB 解析库',
  
  themeConfig: {
    nav: [
      { text: '首页', link: '/' },
      { text: '指南', link: '/guide/getting-started' },
      { text: 'API', link: '/api/epub-reader' },
      { text: '示例', link: '/examples/vue3' },
    ],

    sidebar: [
      {
        text: '介绍',
        items: [
          { text: '什么是 EPUB Reader Core？', link: '/' },
          { text: '快速开始', link: '/guide/getting-started' },
          { text: '安装', link: '/guide/installation' },
        ]
      },
      {
        text: '使用指南',
        items: [
          { text: '基础用法', link: '/guide/basic-usage' },
          { text: '元数据提取', link: '/guide/metadata' },
          { text: '章节阅读', link: '/guide/chapters' },
          { text: '目录导航', link: '/guide/table-of-contents' },
          { text: '资源和图片', link: '/guide/resources' },
        ]
      },
      {
        text: 'API 参考',
        items: [
          { text: 'EpubReader', link: '/api/epub-reader' },
          { text: '类型定义', link: '/api/types' },
        ]
      },
      {
        text: '示例',
        items: [
          { text: 'Vue 3', link: '/examples/vue3' },
          { text: 'React', link: '/examples/react' },
          { text: '原生 JavaScript', link: '/examples/vanilla' },
        ]
      },
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/your-username/epub-reader-core' }
    ],

    footer: {
      message: '基于 MIT 许可证发布。',
      copyright: 'Copyright © 2024 EPUB Reader Core'
    },

    search: {
      provider: 'local'
    }
  }
})