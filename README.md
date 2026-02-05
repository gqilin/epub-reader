# EPUB Reader Core

一个强大的 TypeScript EPUB 阅读器库，支持浏览器环境，具有高级标记功能和样式控制。

## 🚀 快速开始

### 安装

```bash
pnpm add epub-reader-core
```

### 基础使用

```typescript
import { EpubReader } from 'epub-reader-core';

const reader = new EpubReader();
await reader.load(epubData);
await reader.renderChapter(0, 'container');
```

## ✨ 特性

### 🎯 核心功能
- 📚 支持多种格式输入 (ArrayBuffer, Uint8Array, Blob, File)
- 🎯 框架无关 - 支持任何 JavaScript 框架
- 📖 提取书籍元数据、目录、章节内容
- 🖼️ 自动提取封面图片
- 🎛️ 内置章节导航
- 🎨 自动内容渲染到 DOM 元素
- 🛠️ 完整的 TypeScript 支持

### 🎨 标记功能
- 📝 **4种标记类型**: 高亮、下划线、笔记、书签
- 🎨 **6种下划线样式**: 实线、虚线、点线、波浪线、双线、粗线
- 💾 **数据持久化**: LocalStorage 存储，支持导入导出
- 🔄 **章节切换**: 无缝标记渲染
- 🐛 **调试工具**: 完整的调试面板和状态监控
- 📱 **响应式设计**: 完美适配移动端和桌面端

### 🎨 样式控制
- 🔧 **字体控制**: 字体、字号、粗细设置
- 🎨 **颜色设置**: 文字颜色、背景颜色选择器
- 📝 **段落设置**: 行高、段间距、首行缩进
- ↔️ **对齐设置**: 文本对齐方式
- ⚡ **高级设置**: 最大宽度、字符间距、词间距
- 💾 **配置管理**: 样式配置导入导出，默认重置

## 🏗️ 项目结构

```
epubreader/
├── src/                    # 核心源代码
│   ├── EpubReader.ts      # 主类（包含标记和样式功能）
│   ├── types.ts            # 类型定义
│   └── index.ts            # 入口文件
├── examples/               # 示例项目
│   └── vue3/               # Vue3 完整示例
├── docs/                   # 文档目录
│   ├── ANNOTATION_FEATURES.md  # 标记功能完整指南
│   ├── STYLE_FEATURE_TEST.md   # 样式功能测试指南
│   ├── api/                # API 文档
│   └── guide/              # 使用指南
└── dist/                   # 构建输出
```

## 🚀 开发指南

### 1. 克隆项目

```bash
git clone https://github.com/your-username/epub-reader-core.git
cd epub-reader-core
```

### 2. 安装依赖

```bash
pnpm install
```

### 3. 启动文档服务器

```bash
# 启动文档网站（推荐）
pnpm run docs:dev

# 访问 http://localhost:5173 查看完整文档
```

### 4. 开发模式

```bash
# 启动开发模式，监听文件变化
pnpm run dev
```

### 5. 运行示例

```bash
# 启动 Vue3 示例
cd examples/vue3
pnpm install
pnpm run dev

# 访问 http://localhost:5173 体验完整功能
```

### 6. 调试项目

```bash
# 类型检查
pnpm run type-check

# 代码检查
pnpm run lint

# 修复代码格式
pnpm run lint:fix

# 运行测试
pnpm test
```

### 7. 构建项目

```bash
# 构建生产版本
pnpm run build

# 构建文档
pnpm run docs:build

# 预览构建结果
pnpm run preview
```

## 📦 发布插件

### 准备发布

1. **更新版本号**
```bash
pnpm version patch  # 补丁版本
pnpm version minor  # 次版本
pnpm version major  # 主版本
```

2. **构建项目**
```bash
pnpm run build
```

3. **运行测试**
```bash
pnpm test
```

### 发布到 npm

```bash
# 登录 npm（如果未登录）
pnpm dlx npm-cli-login

# 发布到 npm
pnpm publish

# 发布 beta 版本
pnpm publish --tag beta
```

### 发布配置

确保 `package.json` 包含正确的发布配置：

```json
{
  "name": "epub-reader-core",
  "version": "1.0.0",
  "description": "A powerful TypeScript EPUB reader library",
  "main": "dist/index.js",
  "module": "dist/index.esm.js",
  "types": "dist/index.d.ts",
  "files": [
    "dist",
    "README.md",
    "LICENSE"
  ],
  "keywords": ["epub", "reader", "typescript", "annotation"],
  "repository": {
    "type": "git",
    "url": "https://github.com/your-username/epub-reader-core.git"
  },
  "author": "Your Name",
  "license": "MIT"
}
```

## 📚 文档

### 📖 在线文档
- **[完整文档](./docs/)** - 启动文档服务器查看
- **[标记功能指南](./docs/ANNOTATION_FEATURES.md)** - 详细标记功能说明
- **[样式功能测试](./docs/STYLE_FEATURE_TEST.md)** - 样式功能完整测试
- **[API 参考](./docs/api/epub-reader.md)** - 完整 API 文档

### 🎯 快速链接
- **[安装指南](./docs/guide/installation.md)**
- **[快速开始](./docs/guide/getting-started.md)**
- **[基础用法](./docs/guide/basic-usage.md)**
- **[Vue3 示例](./examples/vue3/)** - 完整的 Vue3 实现

## 🔧 开发工具

### 可用脚本

| 脚本 | 描述 |
|------|------|
| `pnpm run dev` | 开发模式，监听文件变化 |
| `pnpm run build` | 构建生产版本 |
| `pnpm run type-check` | TypeScript 类型检查 |
| `pnpm run lint` | ESLint 代码检查 |
| `pnpm run lint:fix` | 自动修复代码格式 |
| `pnpm test` | 运行测试 |
| `pnpm run docs:dev` | 启动文档开发服务器 |
| `pnpm run docs:build` | 构建文档网站 |
| `pnpm run preview` | 预览构建结果 |

### 调试技巧

1. **浏览器调试**
   - 使用浏览器开发者工具调试 EPUB 解析
   - 查看网络请求了解文件加载过程
   - 使用控制台输出调试标记功能

2. **Vue 示例调试**
   - 安装 Vue DevTools 浏览器扩展
   - 在 Vue DevTools 中查看组件状态
   - 使用示例中的调试面板监控功能

3. **样式调试**
   - 使用浏览器元素检查器查看样式应用
   - 通过调试面板验证样式设置
   - 检查 LocalStorage 中的样式数据

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

## 🌟 致谢

感谢所有为这个项目做出贡献的开发者！

---

**快速提示**: 
- 🚀 运行 `pnpm run docs:dev` 查看完整文档
- 🎯 查看 `examples/vue3` 体验完整功能
- 📚 阅读 [文档索引](./docs/README.md) 了解更多