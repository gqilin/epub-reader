# EPUB阅读器标记功能

## 🎯 功能概述

本项目已成功实现了完整的EPUB阅读器标记功能，支持高亮、下划线、笔记和书签四种标记类型。

### ✨ 核心特性

- **🎨 精确标记**：基于SVG覆盖层的精确定位，支持复杂文字选择
- **🛠️ 智能工具栏**：自动跟随选中文字显示，3秒后自动隐藏
- **💾 数据持久化**：LocalStorage本地存储，支持导出/导入
- **📍 CFI集成**：基于EPUB CFI标准的精确位置定位
- **📱 响应式设计**：完美适配移动端和桌面端

## 🚀 快速开始

### 安装

```bash
npm install
npm run build
```

### 基础使用

```typescript
import { EpubReader } from 'epub-reader-src';

const reader = new EpubReader({
  targetElementId: 'epub-container'
});

// 加载EPUB文件
await reader.load(epubData);

// 设置标记功能
reader.setupAnnotations({
  containerId: 'epub-container',
  toolbarId: 'annotation-toolbar',
  onAnnotationCreated: (annotation) => console.log('Created:', annotation)
});
```

## 📋 标记类型

| 类型 | 图标 | 颜色 | 用途 |
|------|------|------|------|
| 高亮 | 🟨 | 黄色 | 标记重要段落 |
| 下划线 | U̲ | 蓝色 | 强调关键文字 |
| 笔记 | 📝 | 绿色 | 添加个人注释 |
| 书签 | 🔖 | 橙色 | 快速定位位置 |

## 🔧 API参考

### 主要方法

```typescript
// 设置标记功能
reader.setupAnnotations(options: AnnotationOptions): void

// 从选择创建标记
reader.createAnnotationFromSelection(type: AnnotationType, options?: any): Promise<Annotation>

// 管理标记
reader.removeAnnotation(id: string): Promise<void>
reader.updateAnnotation(id: string, updates: Partial<Annotation>): Promise<Annotation>
reader.getAnnotations(chapterId?: string): Annotation[]

// 数据导入导出
reader.exportAnnotations(): string
reader.importAnnotations(data: string, merge?: boolean): Promise<void>
```

### 事件监听

```typescript
const manager = reader.getAnnotationManager();

manager.on('created', (annotation: Annotation) => {
  console.log('新标记创建:', annotation);
});

manager.on('removed', (id: string) => {
  console.log('标记删除:', id);
});

manager.on('updated', (annotation: Annotation) => {
  console.log('标记更新:', annotation);
});
```

## 🏗️ 架构设计

### 核心组件

1. **SVGOverlayManager**：SVG覆盖层管理器
   - 精确定位和渲染标记
   - 支持多种标记样式
   - 处理响应式布局

2. **TextSelectionManager**：文字选择管理器
   - 监听文字选择事件
   - 智能工具栏定位
   - 自动隐藏机制

3. **AnnotationManagerImpl**：标记管理器
   - 数据持久化
   - 事件系统
   - 导入导出功能

4. **AnnotationStorage**：存储管理器
   - LocalStorage操作
   - 版本兼容性检查
   - 数据格式验证

### 数据流

```
用户选择文字 → TextSelectionManager → 显示工具栏 → 用户选择标记类型 → AnnotationManager → 创建标记 → SVGOverlayManager → 渲染标记 → AnnotationStorage → 保存数据
```

## 📁 项目结构

```
src/
├── EpubReader.ts          # 主类（包含标记功能）
├── types.ts               # 类型定义（包含标记类型）
├── jszip-wrapper.ts       # JSZip包装器
└── index.ts               # 入口文件

examples/
├── vue3/                  # Vue3示例应用
│   └── src/components/
│       └── EpubViewer.vue  # 包含标记功能的Vue组件
├── annotation-test.html    # 独立测试页面
└── docs/
    └── annotation-guide.md # 详细使用指南
```

## 🎨 自定义样式

### 自定义标记颜色

```typescript
await reader.createAnnotationFromSelection('highlight', {
  color: '#ff5722' // 自定义橙色高亮
});
```

### 自定义工具栏样式

```css
.annotation-toolbar {
  background: #2c3e50;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.3);
}

.tool-btn {
  background: #34495e;
  color: white;
  border-radius: 6px;
}
```

## 📱 移动端优化

- 响应式工具栏定位
- 触摸友好的按钮尺寸
- 优化的弹窗布局
- 防止意外缩放

## 🔍 示例演示

### 运行Vue3示例

```bash
cd examples/vue3
npm install
npm run dev
```

### 运行独立测试

```bash
# 在浏览器中打开 examples/annotation-test.html
```

## ⚡ 性能特性

- **懒加载**：按章节加载标记
- **虚拟化**：大量标记时的性能优化
- **缓存策略**：智能缓存减少重复计算
- **内存管理**：自动清理不需要的数据

## 🛡️ 错误处理

- 完善的类型检查
- 优雅的降级处理
- 详细的错误提示
- 数据恢复机制

## 🚧 未来计划

- [ ] 标记搜索和过滤
- [ ] 标记分类和标签
- [ ] 云端同步支持
- [ ] 协作标记功能
- [ ] 标记导出为PDF
- [ ] AI智能标记建议
- [ ] 标记模板系统
- [ ] 高级样式自定义

## 🤝 贡献指南

1. Fork项目
2. 创建功能分支
3. 提交代码
4. 发起Pull Request

## 📄 许可证

MIT License - 详见LICENSE文件

## 🙏 致谢

感谢所有为这个项目做出贡献的开发者和用户！

---

**注意**：这是一个示例README文件，实际使用时请根据项目的具体情况进行调整。