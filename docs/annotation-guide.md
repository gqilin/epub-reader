# 标记功能使用指南

## 功能概述

EPUB阅读器现在支持完整的标记功能，包括：
- 🟨 高亮标记
- U̲ 下划线标记  
- 📝 笔记标记
- 🔖 书签标记

## 快速开始

### 1. 启用标记功能

在Vue3示例中，点击顶部的"📝 标记"按钮启用标记功能。

### 2. 创建标记

1. **选择文字**：在章节内容中选择任意文字
2. **显示工具栏**：选择文字后会自动显示标记工具栏
3. **选择标记类型**：点击工具栏中的按钮创建相应类型的标记

### 3. 管理标记

点击"📋 列表"按钮查看和管理所有标记：
- 查看标记详情
- 跳转到标记位置
- 删除标记
- 导出/导入标记数据

## 技术特性

### SVG精确覆盖
- 使用SVG层进行精确定位
- 支持复杂的文字选择区域
- 不影响原生DOM结构

### 智能工具栏
- 自动跟随选中文字显示
- 3秒后自动隐藏
- 响应式定位，防止超出视窗

### 数据持久化
- LocalStorage本地存储
- 支持JSON格式导出/导入
- 章节级别的标记管理

### CFI集成
- 基于EPUB CFI标准的精确定位
- 跨章节标记支持
- 与现有导航系统无缝集成

## API参考

### 主要方法

```typescript
// 设置标记功能
reader.setupAnnotations({
  containerId: 'epub-chapter-container',
  toolbarId: 'annotation-toolbar',
  onAnnotationCreated: (annotation) => console.log('Created:', annotation),
  onAnnotationRemoved: (id) => console.log('Removed:', id),
  onAnnotationUpdated: (annotation) => console.log('Updated:', annotation)
});

// 从选择创建标记
const annotation = await reader.createAnnotationFromSelection('highlight', {
  color: '#ffeb3b',
  note: '重要内容'
});

// 获取所有标记
const annotations = reader.getAnnotations();
const currentChapterAnnotations = reader.getAnnotations(chapterId);

// 移除标记
await reader.removeAnnotation(annotationId);

// 更新标记
const updated = await reader.updateAnnotation(annotationId, {
  color: '#ff5722',
  note: '更新后的笔记'
});

// 导出/导入
const exportData = reader.exportAnnotations();
await reader.importAnnotations(jsonData, true); // 合并模式
```

### 标记类型

```typescript
type AnnotationType = 'highlight' | 'underline' | 'note' | 'bookmark';

interface Annotation {
  id: string;
  type: AnnotationType;
  cfi: CFI;
  text: string;
  color?: string;
  note?: string;
  createdAt: Date;
  updatedAt: Date;
  chapterId: string;
  pageNumber?: number;
}
```

## 样式自定义

### SVG标记样式
每个标记类型都有默认样式，可以通过 `color` 参数自定义：

```typescript
// 自定义颜色
await reader.createAnnotationFromSelection('highlight', {
  color: '#ff5722' // 橙色高亮
});
```

### 工具栏样式
工具栏使用CSS类 `annotation-toolbar`，可以通过CSS自定义外观：

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

## 事件系统

标记管理器支持事件监听：

```typescript
const manager = reader.getAnnotationManager();

// 监听创建事件
manager.on('created', (annotation: Annotation) => {
  console.log('新标记:', annotation);
});

// 监听移除事件  
manager.on('removed', (id: string) => {
  console.log('标记被删除:', id);
});

// 监听更新事件
manager.on('updated', (annotation: Annotation) => {
  console.log('标记已更新:', annotation);
});
```

## 最佳实践

1. **性能优化**：大量标记时建议分章节加载
2. **用户体验**：提供颜色选择器和快速标记功能
3. **数据备份**：定期导出标记数据防止丢失
4. **响应式设计**：在移动端优化工具栏和弹窗大小

## 故障排除

### 常见问题

**Q: 工具栏不显示？**
A: 确保已调用 `setupAnnotations()` 并且选择了足够长的文字（至少1个字符）。

**Q: 标记位置不准确？**
A: 检查CFI生成逻辑，确保DOM结构稳定。

**Q: 数据丢失？**
A: 检查浏览器是否支持LocalStorage，或检查存储配额。

**Q: 导入失败？**
A: 验证JSON格式是否正确，版本是否兼容。

### 调试模式

启用控制台日志查看详细调试信息：

```typescript
// 在开发环境中启用详细日志
reader.setupAnnotations({
  containerId: 'epub-chapter-container',
  toolbarId: 'annotation-toolbar',
  onAnnotationCreated: (ann) => console.debug('Created:', ann),
  onAnnotationRemoved: (id) => console.debug('Removed:', id),
  onAnnotationUpdated: (ann) => console.debug('Updated:', ann)
});
```

## 未来计划

- [ ] 标记搜索功能
- [ ] 标记分类和标签
- [ ] 云端同步支持
- [ ] 协作标记功能
- [ ] 标记导出为PDF
- [ ] AI智能标记建议