# EPUB阅读器样式功能测试指南

## 功能概述

本次实现为EPUB阅读器插件添加了完整的样式控制功能，包括：

### 1. 核心功能

#### 样式管理器类 (ReadingStyleManager)
- **单个样式设置**: `setStyle(key, value)`
- **批量样式设置**: `setStyles(styles)`
- **样式获取**: `getStyles()`
- **样式重置**: `resetStyles()`
- **事件监听**: `onStyleUpdate(callback)`

#### 支持的样式属性
- `fontFamily`: 字体设置
- `fontSize`: 字号 (支持 px, em, rem, %, pt)
- `color`: 文字颜色 (支持 hex, rgb, rgba)
- `backgroundColor`: 背景颜色
- `lineHeight`: 行高 (支持数字和百分比)
- `paragraphSpacing`: 段间距
- `textIndent`: 首行缩进
- `textAlign`: 文本对齐 (left, center, right, justify)
- `fontWeight`: 字体粗细
- `letterSpacing`: 字符间距
- `wordSpacing`: 词间距
- `maxWidth`: 最大宽度
- `margin`: 页面边距
- `padding`: 内边距

### 2. Vue示例组件功能

#### UI控制面板
- **字体设置**: 字体选择器、字号滑块、字体粗细
- **颜色设置**: 文字颜色、背景颜色颜色选择器
- **段落设置**: 行高、段间距、首行缩进滑块
- **对齐设置**: 文本对齐按钮组
- **高级设置**: 最大宽度、字符间距、词间距

#### 功能特性
- **实时预览**: 样式修改立即生效
- **数据持久化**: 样式设置自动保存到localStorage
- **配置导入导出**: 支持JSON格式的样式配置文件
- **默认重置**: 一键恢复默认样式
- **移动端适配**: 响应式设计，支持移动设备

### 3. 使用方法

#### 基本用法
```javascript
// 设置单个样式
await reader.setReadingStyle('fontSize', '18px');

// 批量设置样式
await reader.setReadingStyles({
  fontSize: '18px',
  lineHeight: '1.8',
  color: '#333333'
});

// 获取当前样式
const styles = reader.getReadingStyles();

// 重置为默认样式
await reader.resetReadingStyles();

// 监听样式更新
reader.onStyleUpdate((newStyles) => {
  console.log('样式已更新:', newStyles);
});
```

#### Vue组件使用
```vue
<template>
  <EpubViewer :reader="reader" ref="viewerRef" />
</template>

<script setup>
import { ref } from 'vue';
import { EpubReader } from 'epub-reader-src';
import EpubViewer from './components/EpubViewer.vue';

const reader = new EpubReader({ targetElementId: 'epub-chapter-container' });
const viewerRef = ref();

// 打开样式面板
viewerRef.value?.toggleStylePanel();

// 程序化设置样式
await viewerRef.value?.updateStyle('fontSize', '20px');
</script>
```

### 4. 技术特性

#### 数据验证
- 样式值格式验证
- 数值范围检查
- 错误处理和回滚

#### 性能优化
- 样式缓存机制
- DOM操作优化
- 防抖处理

#### 兼容性
- 浏览器兼容性检查
- 版本数据迁移
- 优雅降级

### 5. 存储格式

#### localStorage存储键名
- `epub-reading-styles`: 样式设置
- `epub-annotations`: 标记数据

#### 配置文件格式
```json
{
  "version": "1.0",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "styles": {
    "fontFamily": "\"Microsoft YaHei\", sans-serif",
    "fontSize": "16px",
    "color": "#333333",
    "lineHeight": "1.6",
    "paragraphSpacing": "1em",
    "backgroundColor": "#ffffff",
    "maxWidth": "800px",
    "margin": "0 auto",
    "padding": "20px",
    "textAlign": "left",
    "fontWeight": "normal",
    "letterSpacing": "normal",
    "wordSpacing": "normal",
    "textIndent": "2em"
  }
}
```

### 6. 测试要点

#### 功能测试
1. **单个样式设置**: 测试每个样式属性的设置
2. **批量样式设置**: 测试同时设置多个样式
3. **样式获取**: 验证返回的样式数据完整性
4. **样式重置**: 验证重置后的默认值
5. **持久化**: 刷新页面后样式是否保持
6. **导入导出**: 测试配置文件的导入导出功能

#### UI测试
1. **面板交互**: 打开/关闭样式面板
2. **控件操作**: 各种输入控件的功能
3. **实时预览**: 修改样式后的即时效果
4. **移动端**: 移动设备上的响应式布局

#### 异常测试
1. **无效值**: 测试各种无效的样式值
2. **边界值**: 测试数值范围边界
3. **网络异常**: 导入导出时的网络问题
4. **存储异常**: localStorage存储异常

### 7. 注意事项

#### 样式优先级
- 插件样式通过`<style>`标签注入
- 优先级高于默认CSS但低于!important
- 使用ID选择器确保优先级

#### 兼容性注意
- 某些CSS属性在旧浏览器中可能不支持
- 颜色格式兼容性处理
- 单位转换和验证

#### 性能注意
- 避免频繁的DOM操作
- 合理的防抖处理
- 大量文本的样式应用性能

## 总结

本次实现完整了EPUB阅读器的样式控制功能，提供了：

✅ **完整的样式管理API**
✅ **用户友好的UI界面**  
✅ **数据持久化和配置管理**
✅ **移动端适配**
✅ **完善的错误处理**
✅ **类型安全和数据验证**

用户可以通过直观的UI界面调整阅读样式，所有设置会自动保存，支持导入导出配置，大大提升了阅读体验。