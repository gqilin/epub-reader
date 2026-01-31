# 翻页模式笔记导航修复说明

## 问题描述
在翻页模式下，通过笔记列表只能跳转到章节，无法滚动到具体的位置。

## 解决方案
为 EPUBViewer 添加了以下功能：

### 1. 翻页模式位置导航
- 新增 `navigateToPositionInPagingMode(cfi)` 方法
- 根据CFI查找目标元素所在的页面
- 自动切换到包含目标元素的页面

### 2. 笔记导航接口
- 新增 `navigateToNote(note)` 方法
- 自动处理章节切换（如果需要）
- 根据当前阅读模式选择合适的导航方式

### 3. CFIManager增强
- 修改 `navigateToBookID` 方法，自动检测翻页模式
- 在翻页模式下使用专门的页面导航逻辑

## 使用方法

### 基本用法
```javascript
// 假设有一个笔记对象
const note = {
  id: 'note-123',
  type: 'note',
  title: '重要笔记',
  content: '这是笔记内容',
  cfi: 'book:/chapter1/[4]/p[2]/text[3]',
  chapterId: 'chapter1'
};

// 导航到笔记位置
await viewer.navigateToNote(note);
```

### 笔记列表集成
```javascript
// 在笔记列表的点击事件中使用
document.querySelectorAll('.note-item').forEach(item => {
  item.addEventListener('click', async (e) => {
    const noteData = JSON.parse(item.dataset.note);
    await viewer.navigateToNote(noteData);
  });
});
```

## 技术细节

### 翻页模式导航流程
1. 解析CFI找到目标DOM元素
2. 遍历所有页面元素找到包含目标元素的页面
3. 更新当前页码并切换页面
4. 可选：临时高亮目标元素

### 兼容性处理
- 自动检测当前阅读模式（滚动/翻页）
- 在翻页模式下使用页面导航
- 在滚动模式下保持原有的滚动导航
- 自动处理跨章节导航

### 新增方法
- `navigateToPositionInPagingMode(cfi)`: 翻页模式位置导航
- `navigateToNote(note)`: 笔记导航
- `highlightTargetElement(element)`: 目标元素高亮

## 注意事项

1. **全局引用**: 为了让CFIManager能够访问viewer实例，设置了`window.viewer`全局引用
2. **异步加载**: CFI相关模块使用动态导入以优化加载性能
3. **错误处理**: 所有导航方法都包含完整的错误处理机制
4. **内存管理**: 在销毁时正确清理全局引用和事件监听器

## 支持的笔记对象结构
```typescript
interface Note {
  id: string;
  type: 'note' | 'highlight' | 'bookmark';
  title?: string;
  content: string;
  cfi: string; // Canonical Fragment Identifier
  chapterId: string;
  // ... 其他可选字段
}
```

## 向后兼容性
- 现有的滚动模式导航不受影响
- API保持向后兼容
- 新功能为可选使用