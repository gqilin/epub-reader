# SVG Mark 增强标记功能使用指南

本项目为 EPUB Reader 添加了基于 SVG 的高级标记功能，支持自定义颜色、多种样式、工具栏集成等特性。

## 🚀 功能特性

### ✅ 已实现功能

1. **自定义标记颜色** - 支持任意颜色选择和预设颜色方案
2. **扩展编辑样式** - 高亮背景、下划线、虚线、波浪线、点线等
3. **Vue 工具栏集成** - 通过 DOM ID 控制，插件自动管理显示/隐藏
4. **智能文本选择** - 选中文字后自动显示工具栏
5. **CFI 信息获取** - 获取选中区域的 CFI 和文字信息
6. **点击事件回调** - 点击标记触发 Vue 组件处理逻辑
7. **标记列表管理** - 支持添加、删除、修改标记
8. **导入导出功能** - 标记数据的持久化管理

## 📦 安装和配置

### 1. 安装依赖

```bash
npm install svg-mark
```

### 2. 基础配置

```typescript
import { SVGMarkManager } from 'epub-reader-core';

// 创建 SVG 标记管理器
const svgMarkManager = new SVGMarkManager(
  'epub-viewer', // 目标元素 ID
  {
    onAnnotationCreated: (annotation) => {
      console.log('标记创建:', annotation);
    },
    onAnnotationDeleted: (markId) => {
      console.log('标记删除:', markId);
    },
    onSelectionChange: (selection) => {
      console.log('选择变化:', selection);
    }
  },
  {
    elementId: 'epub-marking-toolbar',
    colors: ['#ffeb3b', '#4caf50', '#2196f3', '#e91e63'],
    styles: ['highlight', 'underline', 'dashed', 'wavy'],
    position: 'floating',
    autoHide: true,
    hideDelay: 3000
  }
);
```

## 🎨 标记样式配置

### 支持的样式类型

```typescript
type SVGMarkStyle = {
  type: 'highlight' | 'underline' | 'dashed' | 'dotted' | 'wavy' | 'double' | 'solid';
  color: string;
  strokeWidth?: number;
  opacity?: number;
  padding?: number;
  radius?: number;
};
```

### 预设样式示例

```typescript
// 高亮样式
const highlightStyle = {
  type: 'highlight',
  color: '#ffeb3b',
  opacity: 0.7,
  radius: 2
};

// 下划线样式
const underlineStyle = {
  type: 'underline',
  color: '#2196f3',
  strokeWidth: 2
};

// 波浪线样式
const wavyStyle = {
  type: 'wavy',
  color: '#e91e63',
  strokeWidth: 2
};
```

## 🛠️ Vue 组件集成

### 1. 工具栏组件

```vue
<template>
  <MarkingToolbar
    :elementId="'epub-marking-toolbar'"
    :colors="['#ffeb3b', '#4caf50', '#2196f3', '#e91e63']"
    :styles="['highlight', 'underline', 'dashed', 'wavy']"
    @create-mark="handleCreateMark"
    @delete-mark="handleDeleteMark"
  />
</template>

<script setup>
import { ref } from 'vue';
import MarkingToolbar from './MarkingToolbar.vue';

const handleCreateMark = ({ color, style }) => {
  console.log('创建标记:', { color, style });
};

const handleDeleteMark = () => {
  console.log('删除标记');
};
</script>
```

### 2. 增强阅读器组件

```vue
<template>
  <EnhancedEpubViewer
    :reader="epubReader"
    :epubInfo="epubInfo"
    :viewerElementId="'epub-viewer'"
    :toolbarConfig="toolbarConfig"
    @mark-created="onMarkCreated"
    @mark-deleted="onMarkDeleted"
    @selection-change="onSelectionChange"
  />
</template>

<script setup>
import { ref } from 'vue';
import { EnhancedEpubViewer } from './EnhancedEpubViewer.vue';

const toolbarConfig = {
  elementId: 'epub-marking-toolbar',
  colors: ['#ffeb3b', '#4caf50', '#2196f3', '#e91e63'],
  styles: ['highlight', 'underline', 'dashed', 'wavy'],
  position: 'floating',
  autoHide: true,
  hideDelay: 3000
};

const onMarkCreated = (mark) => {
  console.log('标记创建事件:', mark);
};

const onMarkDeleted = (markId) => {
  console.log('标记删除事件:', markId);
};

const onSelectionChange = (selection) => {
  console.log('文本选择事件:', selection);
};
</script>
```

## 📝 API 使用示例

### 1. 创建标记

```typescript
// 从当前选择创建标记
const mark = svgMarkManager.createMark('#ffeb3b', 'highlight');

// 从外部数据创建标记
const markId = svgMarkManager.addMark({
  cfi: 'epub-cfi-123',
  text: '要标记的文本',
  style: {
    type: 'highlight',
    color: '#4caf50',
    opacity: 0.7
  },
  chapterHref: 'chapter1.xhtml'
});
```

### 2. 管理标记

```typescript
// 获取所有标记
const allMarks = svgMarkManager.getAllMarks();

// 获取当前章节标记
const chapterMarks = svgMarkManager.getMarksByChapter('chapter1.xhtml');

// 删除标记
svgMarkManager.removeMark('mark-123');

// 更新标记样式
svgMarkManager.updateMarkStyle('mark-123', {
  color: '#2196f3',
  type: 'underline'
});

// 清除所有标记
svgMarkManager.clearAllMarks();
```

### 3. 获取选择信息

```typescript
// 获取当前选中的文本信息
const selectionInfo = svgMarkManager.getSelectedTextInfo();
if (selectionInfo) {
  console.log('选中文本:', selectionInfo.text);
  console.log('CFI:', selectionInfo.cfi);
  console.log('章节:', selectionInfo.chapterTitle);
}

// 获取选中的 CFI
const cfi = svgMarkManager.getSelectedCFI();

// 获取选中的文本
const text = svgMarkManager.getSelectedText();
```

### 4. 工具栏控制

```typescript
// 显示工具栏
svgMarkManager.toggleToolbar(true);

// 隐藏工具栏
svgMarkManager.toggleToolbar(false);

// 切换工具栏显示状态
svgMarkManager.toggleToolbar();
```

## 🎯 事件处理

### 1. 标记点击事件

```typescript
// 监听标记点击
document.addEventListener('markClick', (event) => {
  const { mark, annotation } = event.detail;
  
  console.log('标记被点击:', mark);
  
  // 显示标记详情
  showMarkDetails(mark);
  
  // 或者触发其他业务逻辑
  handleMarkInteraction(annotation);
});
```

### 2. 工具栏事件

```typescript
const svgMarkManager = new SVGMarkManager(
  'epub-viewer',
  {
    // 标记创建事件
    onAnnotationCreated: (annotation) => {
      // 保存到数据库
      saveAnnotationToDatabase(annotation);
      
      // 更新 UI
      updateMarksList();
    },
    
    // 标记删除事件
    onAnnotationDeleted: (markId) => {
      // 从数据库删除
      deleteAnnotationFromDatabase(markId);
      
      // 更新 UI
      updateMarksList();
    },
    
    // 选择变化事件
    onSelectionChange: (selection) => {
      if (selection) {
        // 显示上下文操作
        showContextActions(selection);
      } else {
        // 隐藏上下文操作
        hideContextActions();
      }
    },
    
    // 工具栏显示/隐藏事件
    onToolbarToggle: (visible) => {
      console.log('工具栏显示状态:', visible);
    }
  }
);
```

## 📊 数据导入导出

### 1. 导出标记

```typescript
const exportMarks = () => {
  const marks = svgMarkManager.getAllMarks();
  const dataStr = JSON.stringify(marks, null, 2);
  
  // 下载为文件
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `epub-marks-${new Date().toISOString().split('T')[0]}.json`;
  link.click();
  
  URL.revokeObjectURL(url);
};
```

### 2. 导入标记

```typescript
const importMarks = (marksData) => {
  try {
    // 验证数据格式
    if (!Array.isArray(marksData)) {
      throw new Error('标记数据必须是数组');
    }
    
    // 批量添加标记
    const markIds = svgMarkManager.addMarks(marksData);
    console.log(`成功导入 ${markIds.length} 个标记`);
    
  } catch (error) {
    console.error('导入标记失败:', error);
  }
};
```

## 🎨 自定义样式示例

### 1. 创建自定义颜色主题

```typescript
const customTheme = {
  colors: [
    '#FF6B6B', // 红色
    '#4ECDC4', // 青色
    '#45B7D1', // 蓝色
    '#96CEB4', // 绿色
    '#FFEAA7', // 黄色
    '#DDA0DD', // 紫色
    '#F4A460', // 沙色
    '#98D8C8'  // 薄荷色
  ],
  styles: [
    'highlight',
    'underline',
    'dashed',
    'wavy',
    'dotted'
  ]
};
```

### 2. 响应式工具栏配置

```typescript
const responsiveToolbarConfig = {
  elementId: 'epub-marking-toolbar',
  colors: customTheme.colors,
  styles: customTheme.styles,
  position: window.innerWidth > 768 ? 'floating' : 'top',
  autoHide: window.innerWidth > 768,
  hideDelay: window.innerWidth > 768 ? 3000 : 5000
};
```

## 🔧 高级配置

### 1. 自定义 CFI 生成

```typescript
const svgMarkManager = new SVGMarkManager('epub-viewer', {
  // 自定义 CFI 生成逻辑
  onSelectionChange: (selection) => {
    if (selection) {
      // 生成更精确的 CFI
      const preciseCFI = generatePreciseCFI(selection.range);
      selection.cfi = preciseCFI;
    }
  }
});
```

### 2. 标记持久化

```typescript
class PersistentMarkManager extends SVGMarkManager {
  constructor(elementId, options, toolbarConfig) {
    super(elementId, options, toolbarConfig);
    this.loadMarksFromStorage();
  }
  
  // 保存标记到本地存储
  private saveMarksToStorage() {
    const marks = this.getAllMarks();
    localStorage.setItem('epub-marks', JSON.stringify(marks));
  }
  
  // 从本地存储加载标记
  private loadMarksFromStorage() {
    const stored = localStorage.getItem('epub-marks');
    if (stored) {
      try {
        const marks = JSON.parse(stored);
        this.addMarks(marks);
      } catch (error) {
        console.error('加载标记失败:', error);
      }
    }
  }
  
  // 重写创建标记方法
  public createMark(color, style) {
    const mark = super.createMark(color, style);
    if (mark) {
      this.saveMarksToStorage();
    }
    return mark;
  }
  
  // 重写删除标记方法
  public removeMark(markId) {
    const success = super.removeMark(markId);
    if (success) {
      this.saveMarksToStorage();
    }
    return success;
  }
}
```

## 🐛 常见问题和解决方案

### 1. 工具栏不显示

**问题**: 工具栏创建成功但不显示

**解决方案**:
```typescript
// 确保工具栏元素存在
const toolbarElement = document.getElementById('epub-marking-toolbar');
if (!toolbarElement) {
  console.error('工具栏元素不存在');
}

// 检查 CSS 样式
toolbarElement.style.display = 'block';
toolbarElement.style.visibility = 'visible';
toolbarElement.style.zIndex = '1001';
```

### 2. 标记位置不准确

**问题**: SVG 标记位置与文本不匹配

**解决方案**:
```typescript
// 确保目标元素有正确的定位
const targetElement = document.getElementById('epub-viewer');
targetElement.style.position = 'relative';
targetElement.style.overflow = 'visible';

// 检查 SVG 容器位置
const svgContainer = svgMarkManager.svgContainer;
if (svgContainer) {
  svgContainer.style.position = 'absolute';
  svgContainer.style.top = '0';
  svgContainer.style.left = '0';
  svgContainer.style.width = '100%';
  svgContainer.style.height = '100%';
}
```

### 3. 事件冲突

**问题**: 标记点击事件与其他组件冲突

**解决方案**:
```typescript
// 使用事件委托和.stopPropagation()
g.addEventListener('click', (event) => {
  event.stopPropagation(); // 防止事件冒泡
  event.preventDefault();  // 防止默认行为
  
  // 触发自定义事件
  const customEvent = new CustomEvent('markClick', {
    detail: { mark },
    bubbles: true
  });
  document.dispatchEvent(customEvent);
});
```

## 📱 移动端适配

### 响应式配置

```typescript
const getMobileConfig = () => ({
  colors: ['#ffeb3b', '#4caf50', '#2196f3', '#e91e63'],
  styles: ['highlight', 'underline'],
  position: 'bottom',
  autoHide: false,
  hideDelay: 0,
  elementId: 'mobile-marking-toolbar'
});

// 根据屏幕尺寸切换配置
const isMobile = window.innerWidth <= 768;
const config = isMobile ? getMobileConfig() : desktopConfig;

const svgMarkManager = new SVGMarkManager('epub-viewer', options, config);
```

## 🎯 最佳实践

### 1. 性能优化

```typescript
// 使用防抖优化选择事件
const debouncedSelectionHandler = debounce((event) => {
  svgMarkManager.handleSelection(event);
}, 100);

document.addEventListener('mouseup', debouncedSelectionHandler);
```

### 2. 内存管理

```typescript
// 组件卸载时清理资源
onUnmounted(() => {
  if (svgMarkManager) {
    svgMarkManager.destroy();
    svgMarkManager = null;
  }
});
```

### 3. 错误处理

```typescript
const safeCreateMark = (color, style) => {
  try {
    return svgMarkManager.createMark(color, style);
  } catch (error) {
    console.error('创建标记失败:', error);
    // 显示用户友好的错误信息
    showError('标记创建失败，请重试');
    return null;
  }
};
```

## 📚 完整示例

参考 `examples/vue3/src/App.vue` 文件，查看完整的集成示例，包括：

- EPUB 加载和显示
- SVG 标记功能集成
- 工具栏自定义配置
- 标记数据管理
- 导入导出功能
- 响应式设计

这个示例展示了如何在实际项目中使用所有 SVG 标记功能。