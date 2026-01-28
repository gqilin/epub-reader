# 📚 EPUBReader

一个功能强大、框架无关的 **TypeScript/JavaScript** EPUB 解析和阅读库。

✨ **完全 TypeScript 支持** - 提供完整类型定义和智能提示。

## ✨ 特性

- 🎯 **完整EPUB支持** - 支持EPUB 2.0/3.0格式
- 🖼️ **DOM渲染** - 内置阅读器，可直接渲染到网页
- 🎨 **样式控制** - 丰富的主题和字体设置
- 🔍 **全文搜索** - 支持关键词和正则搜索
- 📱 **响应式** - 适配桌面和移动设备
- 🧩 **零依赖** - 核心库无外部依赖
- 🌐 **环境兼容** - 浏览器和Node.js均可使用

## 🚀 快速开始

### TypeScript 使用

```typescript
import EPUBReader, { EPUBViewer, ViewerOptions } from 'epubreader';

// 类型安全的阅读器初始化
const options: ViewerOptions = {
    contentArea: document.getElementById('content')!,
    tocArea: document.getElementById('toc')!,
    metadataArea: document.getElementById('metadata')!,
    onChapterChange: (chapter) => {
        console.log(`当前章节: ${chapter.title}`);
    }
};

const viewer = new EPUBViewer(options);
await viewer.load(epubArrayBuffer);
```

### JavaScript 使用

```html
<script src="./dist/epubreader.js"></script>
<script>
// 创建阅读器实例
const viewer = new EPUBReader.Viewer({
    contentArea: document.getElementById('content'),
    tocArea: document.getElementById('toc'),
    metadataArea: document.getElementById('metadata')
});

// 加载EPUB
await viewer.load(epubArrayBuffer);

// 样式控制
const styleController = new EPUBReader.StyleController(viewer);
styleController.applyTheme('dark');
styleController.applyFontSize('lg');

// 章节导航
await viewer.nextChapter();
</script>
```

## 🎮 在线演示

- [完整功能演示](./viewer-demo.html) - 现代化阅读器界面
- [简洁示例](./simple-viewer.html) - 基本功能展示
- [详细测试](./test-detailed.html) - 完整功能测试

## 📦 安装

```bash
# NPM
npm install epubreader

# PNPM (推荐)
pnpm install epubreader

# Yarn
yarn add epubreader
```

## 🔧 构建项目

```bash
# 安装依赖
pnpm install

# 开发模式
pnpm dev

# 构建
pnpm build

# 测试
pnpm test

# 代码检查
pnpm lint
```

## 📁 项目结构

```
epubreader/
├── src/
│   ├── core/               # 核心模块
│   │   ├── EPUBParser.js   # EPUB解析器
│   │   ├── EPUBViewer.js   # DOM阅读器
│   │   └── StyleController.js # 样式控制
│   ├── models/             # 数据模型
│   ├── utils/              # 工具类
│   └── index.js            # 入口文件
├── dist/                   # 构建输出
├── examples/               # 使用示例
├── tests/                  # 测试文件
└── *.html                  # 演示页面
```

## 🎨 主题样式

| 主题 | 描述 |
|------|------|
| `light` | 浅色主题，适合白天阅读 |
| `dark` | 深色主题，适合夜间阅读 |
| `sepia` | 护眼主题，温暖色调 |
| `paper` | 纸质主题，模拟纸质书 |

## 📖 API文档

### EPUBReader (解析器)

```javascript
class EPUBReader {
    async load(source)              // 加载EPUB文件
    getMetadata()                    // 获取元数据
    getTableOfContents()             // 获取目录
    getChapters()                    // 获取章节列表
    async getChapter(id)             // 获取章节内容
    async search(query, options)     // 搜索内容
    destroy()                        // 销毁实例
}
```

### EPUBViewer (阅读器)

```javascript
class EPUBViewer {
    constructor(options)             // 初始化阅读器
    async load(source)               // 加载EPUB
    async loadChapter(id)            // 加载章节
    async nextChapter()              // 下一章
    async previousChapter()          // 上一章
    updateStyles(styles)             // 更新样式
    destroy()                        // 销毁实例
}
```

### StyleController (样式控制)

```javascript
class StyleController {
    applyTheme(name)                 // 应用主题
    applyFont(font)                  // 应用字体
    applyFontSize(size)              // 应用字号
    setFontColor(color)              // 设置文字颜色
    setBackgroundColor(color)       // 设置背景颜色
    createControlPanel(container)    // 创建控制面板
}
```

## 🧪 浏览器兼容性

- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## 📄 许可证

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

🎉 **享受你的EPUB阅读之旅！**