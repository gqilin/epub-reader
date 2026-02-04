## 修复总结

### 问题分析
Vue组件在自动隐藏工具栏时出现了 `Cannot read properties of null (reading 'insertBefore')` 错误，这是因为：

1. **DOM操作时序问题** - Vue在组件更新周期外操作DOM
2. **计时器清理不当** - 组件卸载后计时器仍在执行
3. **事件监听器冲突** - 多个地方同时控制工具栏显示/隐藏

### 修复措施

#### 1. **Vue组件时序优化** (MarkingToolbar.vue)
```typescript
// 使用 nextTick 确保DOM操作在正确周期
const hide = () => {
  nextTick(() => {
    isVisible.value = false;
    selectionInfo.value = null;
    emit('visibility-change', false);
  });
};
```

#### 2. **组件生命周期管理**
```typescript
onUnmounted(() => {
  // 清理所有事件监听器
  document.removeEventListener('showMarkingToolbar', handleSelectionChange);
  document.removeEventListener('hideMarkingToolbar', handleToolbarHide);
  
  // 清理计时器
  if (hideTimer) {
    clearTimeout(hideTimer);
    hideTimer = null;
  }
  
  // 强制清理状态
  isVisible.value = false;
  selectionInfo.value = null;
});
```

#### 3. **事件协调优化** 
- 移除SVGMarkManager中的文档点击监听
- 统一通过自定义事件控制工具栏
- 简化自动隐藏逻辑

#### 4. **边界检查改进**
```typescript
// 确保坐标在视窗范围内
const x = Math.max(50, Math.min(position.value.x, window.innerWidth - 50));
const y = Math.max(50, Math.min(position.value.y, window.innerHeight - 50));
```

### 关键改进

1. **防止内存泄漏** - 正确清理计时器和事件监听器
2. **时序安全** - 使用nextTick确保Vue更新周期
3. **错误容错** - 添加状态检查防止无效操作
4. **边界保护** - 防止工具栏超出视窗范围

### 测试文件
- `test/toolbar-test.html` - 简化工具栏测试
- `test/test-marks.html` - 完整标记功能测试

这些修复应该解决工具栏自动隐藏时的Vue渲染错误问题。