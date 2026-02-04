<template>
  <div 
    :id="elementId" 
    class="epub-marking-toolbar"
    v-show="isVisible"
    :style="toolbarStyle"
  >
    <!-- 颜色选择器 -->
    <div class="toolbar-section">
      <div class="toolbar-label">颜色1:</div>
      <div class="color-palette">
        <button
          v-for="color in colors"
          :key="color"
          :class="['color-btn', { active: selectedColor === color }]"
          :style="{ backgroundColor: color }"
          :title="color"
          @click="selectColor(color)"
        />
      </div>
    </div>

    <!-- 样式选择器 -->
    <div class="toolbar-section">
      <div class="toolbar-label">样式:</div>
      <div class="style-buttons">
        <button
          v-for="style in styles"
          :key="style"
          :class="['style-btn', { active: selectedStyle === style }]"
          @click="selectStyle(style)"
        >
          {{ getStyleLabel(style) }}
        </button>
      </div>
    </div>

    <!-- 操作按钮 -->
    <div class="toolbar-section">
      <button class="action-btn create-btn" @click="createMark">
        创建标记
      </button>
      <button class="action-btn delete-btn" @click="deleteMark">
        删除标记
      </button>
    </div>

    <!-- 选区信息 -->
    <div v-if="selectionInfo" class="toolbar-section selection-info">
      <div class="selection-text">
        选中文本: {{ selectionInfo.text.substring(0, 30) }}{{ selectionInfo.text.length > 30 ? '...' : '' }}
      </div>
      <div class="selection-cfi" v-if="selectionInfo.cfi">
        CFI: {{ selectionInfo.cfi.substring(0, 30) }}{{ selectionInfo.cfi.length > 30 ? '...' : '' }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import type { SelectionInfo, SVGMarkStyle } from 'epub-reader-src/types';

interface Props {
  elementId?: string;
  colors?: string[];
  styles?: SVGMarkStyle['type'][];
  position?: 'floating' | 'top' | 'bottom';
  autoHide?: boolean;
  hideDelay?: number;
  initialVisible?: boolean;
}

interface Emits {
  (e: 'color-change', color: string): void;
  (e: 'style-change', style: SVGMarkStyle['type']): void;
  (e: 'create-mark', data: { color: string; style: SVGMarkStyle['type'] }): void;
  (e: 'delete-mark'): void;
  (e: 'visibility-change', visible: boolean): void;
}

const props = withDefaults(defineProps<Props>(), {
  elementId: 'epub-marking-toolbar',
  colors: () => ['#ffeb3b', '#4caf50', '#2196f3', '#e91e63', '#ff9800', '#9c27b0', '#00bcd4'],
  styles: () => ['highlight', 'underline', 'dashed', 'wavy', 'dotted'],
  position: 'floating',
  autoHide: true,
  hideDelay: 3000,
  initialVisible: false
});

const emit = defineEmits<Emits>();

// 响应式状态
const isVisible = ref(props.initialVisible);
const selectedColor = ref(props.colors[0]);
const selectedStyle = ref<SVGMarkStyle['type']>('highlight');
const selectionInfo = ref<SelectionInfo | null>(null);
const position = ref({ x: 0, y: 0 });

// 自动隐藏计时器
let hideTimer: number | null = null;

// 工具栏样式
const toolbarStyle = computed(() => {
  if (props.position === 'floating') {
    return {
      position: 'fixed',
      left: `${position.value.x}px`,
      top: `${position.value.y}px`,
      transform: 'translate(-50%, -100%) translateY(-10px)'
    };
  }
  return {
    position: 'relative'
  };
});

// 选择颜色
const selectColor = (color: string) => {
  selectedColor.value = color;
  emit('color-change', color);
  resetAutoHide();
};

// 选择样式
const selectStyle = (style: SVGMarkStyle['type']) => {
  selectedStyle.value = style;
  emit('style-change', style);
  resetAutoHide();
};

// 创建标记
const createMark = () => {
  emit('create-mark', {
    color: selectedColor.value,
    style: selectedStyle.value
  });
};

// 删除标记
const deleteMark = () => {
  emit('delete-mark');
};

// 获取样式标签
const getStyleLabel = (style: SVGMarkStyle['type']): string => {
  const labels = {
    highlight: '高亮',
    underline: '下划线',
    dashed: '虚线',
    wavy: '波浪线',
    dotted: '点线',
    double: '双线',
    solid: '实线'
  };
  return labels[style] || style;
};

// 显示工具栏
const show = (x: number, y: number, selection?: SelectionInfo | null) => {
  position.value = { x, y };
  selectionInfo.value = selection || null;
  isVisible.value = true;
  emit('visibility-change', true);
  
  resetAutoHide();
};

// 隐藏工具栏
const hide = () => {
  isVisible.value = false;
  selectionInfo.value = null;
  emit('visibility-change', false);
  
  if (hideTimer) {
    clearTimeout(hideTimer);
    hideTimer = null;
  }
};

// 重置自动隐藏计时器
const resetAutoHide = () => {
  if (!props.autoHide) return;

  if (hideTimer) {
    clearTimeout(hideTimer);
  }

  hideTimer = window.setTimeout(() => {
    hide();
  }, props.hideDelay);
};

// 切换显示状态
const toggle = () => {
  if (isVisible.value) {
    hide();
  } else {
    // 如果没有位置信息，显示在屏幕中央
    position.value = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    isVisible.value = true;
    emit('visibility-change', true);
  }
};

// 监听选区变化事件
const handleSelectionChange = (event: CustomEvent) => {
  const { selection, x, y } = event.detail;
  show(x, y, selection);
};

// 监听自定义事件
onMounted(() => {
  document.addEventListener('showMarkingToolbar', handleSelectionChange as EventListener);
});

onUnmounted(() => {
  document.removeEventListener('showMarkingToolbar', handleSelectionChange as EventListener);
  
  if (hideTimer) {
    clearTimeout(hideTimer);
  }
});

// 监听属性变化
watch(() => props.colors, (newColors) => {
  if (newColors.length > 0 && !newColors.includes(selectedColor.value)) {
    selectedColor.value = newColors[0];
  }
}, { immediate: true });

watch(() => props.styles, (newStyles) => {
  if (newStyles.length > 0 && !newStyles.includes(selectedStyle.value)) {
    selectedStyle.value = newStyles[0];
  }
}, { immediate: true });

// 暴露方法给父组件
defineExpose({
  show,
  hide,
  toggle,
  isVisible: () => isVisible.value,
  selectedColor: () => selectedColor.value,
  selectedStyle: () => selectedStyle.value,
  selectColor,
  selectStyle
});
</script>

<style scoped>
.epub-marking-toolbar {
  background: #ffffff;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1001;
  min-width: 280px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 14px;
}

.toolbar-section {
  margin-bottom: 12px;
}

.toolbar-section:last-child {
  margin-bottom: 0;
}

.toolbar-label {
  font-size: 12px;
  font-weight: 500;
  color: #666;
  margin-bottom: 6px;
}

.color-palette {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.color-btn {
  width: 28px;
  height: 28px;
  border: 2px solid transparent;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
}

.color-btn:hover {
  transform: scale(1.1);
  border-color: #333;
}

.color-btn.active {
  border-color: #1976d2;
  box-shadow: 0 0 0 2px rgba(25, 118, 210, 0.2);
}

.color-btn.active::after {
  content: '✓';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: white;
  font-size: 12px;
  font-weight: bold;
  text-shadow: 0 0 2px rgba(0, 0, 0, 0.5);
}

.style-buttons {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.style-btn {
  padding: 6px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: #f5f5f5;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 12px;
  font-weight: 400;
}

.style-btn:hover {
  background: #e3f2fd;
  border-color: #1976d2;
}

.style-btn.active {
  background: #1976d2;
  color: white;
  border-color: #1976d2;
}

.action-buttons {
  display: flex;
  gap: 8px;
}

.action-btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 12px;
  font-weight: 500;
  min-width: 70px;
}

.create-btn {
  background: #4caf50;
  color: white;
}

.create-btn:hover {
  background: #45a049;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(76, 175, 80, 0.3);
}

.delete-btn {
  background: #f44336;
  color: white;
}

.delete-btn:hover {
  background: #da190b;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(244, 67, 54, 0.3);
}

.selection-info {
  border-top: 1px solid #e0e0e0;
  padding-top: 8px;
  margin-top: 8px;
  background: #f8f9fa;
  border-radius: 4px;
  padding: 8px;
}

.selection-text {
  font-size: 11px;
  color: #333;
  margin-bottom: 4px;
  word-break: break-all;
}

.selection-cfi {
  font-size: 10px;
  color: #666;
  font-family: 'Courier New', monospace;
  word-break: break-all;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .epub-marking-toolbar {
    min-width: 240px;
    padding: 10px;
  }
  
  .color-palette {
    gap: 4px;
  }
  
  .color-btn {
    width: 24px;
    height: 24px;
  }
  
  .style-buttons {
    gap: 4px;
  }
  
  .style-btn {
    padding: 4px 8px;
    font-size: 11px;
  }
  
  .action-btn {
    padding: 6px 12px;
    font-size: 11px;
    min-width: 60px;
  }
}
</style>