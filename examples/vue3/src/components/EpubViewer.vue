<template>
  <div class="epub-viewer">
    <div class="viewer-header">
      <button @click="onPreviousChapter" :disabled="!hasPreviousChapter" class="nav-btn">
        ← Previous
      </button>
      
      <select v-model="currentChapterIndex" class="chapter-select" @change="onChapterChange">
        <option v-for="(chapter, index) in chapters" :key="chapter.id" :value="index">
          {{ getChapterTitle(chapter, index) }}
        </option>
      </select>
      
      <button @click="onNextChapter" :disabled="!hasNextChapter" class="nav-btn">
        Next →
      </button>
      
      <!-- 标记控制按钮 -->
      <div class="annotation-controls">
        <button @click="toggleAnnotations" class="annotation-toggle" :class="{ active: annotationsEnabled }">
          📝 标记
        </button>
        <button @click="showAnnotationList" class="annotation-list-btn" v-if="annotationsEnabled">
          📋 列表
        </button>
        <button @click="showDebugInfo" class="debug-btn" v-if="annotationsEnabled">
          🐛 调试
        </button>
      </div>
      
      <!-- 样式控制按钮 -->
      <div class="style-controls">
        <button @click="toggleStylePanel" class="style-toggle" :class="{ active: stylePanelVisible }">
          🎨 样式
        </button>
      </div>
    </div>
    
    <!-- 样式控制面板 -->
    <div v-if="stylePanelVisible" class="style-panel">
      <div class="style-panel-header">
        <h3>🎨 阅读样式设置</h3>
        <button @click="toggleStylePanel" class="close-btn">×</button>
      </div>
      <div class="style-panel-body">
        <div class="style-section">
          <h4>字体设置</h4>
          <div class="style-item">
            <label>字体：</label>
            <select v-model="currentStyles.fontFamily" @change="updateStyle('fontFamily', currentStyles.fontFamily)">
              <option value="'Microsoft YaHei', 'PingFang SC', sans-serif">微软雅黑</option>
              <option value="'SimSun', serif">宋体</option>
              <option value="'SimHei', sans-serif">黑体</option>
              <option value="'KaiTi', serif">楷体</option>
              <option value="'FangSong', serif">仿宋</option>
              <option value="system-ui, sans-serif">系统字体</option>
              <option value="'Arial', sans-serif">Arial</option>
              <option value="'Times New Roman', serif">Times New Roman</option>
            </select>
          </div>
          <div class="style-item">
            <label>字号：</label>
            <div class="input-group">
              <input 
                type="range" 
                min="12" 
                max="32" 
                v-model="fontSizeValue" 
                @input="updateFontSize"
                class="range-input"
              />
              <input 
                type="text" 
                v-model="currentStyles.fontSize" 
                @change="updateStyle('fontSize', currentStyles.fontSize)"
                @blur="validateFontSize"
                class="text-input"
                placeholder="16px"
              />
            </div>
          </div>
          <div class="style-item">
            <label>字体粗细：</label>
            <select v-model="currentStyles.fontWeight" @change="updateStyle('fontWeight', currentStyles.fontWeight)">
              <option value="normal">正常</option>
              <option value="bold">粗体</option>
              <option value="300">细体</option>
              <option value="400">正常(400)</option>
              <option value="500">中等</option>
              <option value="600">半粗</option>
              <option value="700">粗体(700)</option>
            </select>
          </div>
        </div>
        
        <div class="style-section">
          <h4>颜色设置</h4>
          <div class="style-item">
            <label>文字颜色：</label>
            <div class="color-input-group">
              <input 
                type="color" 
                v-model="textColorValue" 
                @input="updateTextColor"
                class="color-input"
              />
              <input 
                type="text" 
                v-model="currentStyles.color" 
                @change="updateStyle('color', currentStyles.color)"
                @blur="validateColor"
                class="text-input"
                placeholder="#333333"
              />
            </div>
          </div>
          <div class="style-item">
            <label>背景颜色：</label>
            <div class="color-input-group">
              <input 
                type="color" 
                v-model="backgroundColorValue" 
                @input="updateBackgroundColor"
                class="color-input"
              />
              <input 
                type="text" 
                v-model="currentStyles.backgroundColor" 
                @change="updateStyle('backgroundColor', currentStyles.backgroundColor)"
                @blur="validateColor"
                class="text-input"
                placeholder="#ffffff"
              />
            </div>
          </div>
        </div>
        
        <div class="style-section">
          <h4>段落设置</h4>
          <div class="style-item">
            <label>行高：</label>
            <div class="input-group">
              <input 
                type="range" 
                min="1.0" 
                max="3.0" 
                step="0.1"
                v-model="lineHeightValue" 
                @input="updateLineHeight"
                class="range-input"
              />
              <input 
                type="text" 
                v-model="currentStyles.lineHeight" 
                @change="updateStyle('lineHeight', currentStyles.lineHeight)"
                @blur="validateLineHeight"
                class="text-input"
                placeholder="1.6"
              />
            </div>
          </div>
          <div class="style-item">
            <label>段间距：</label>
            <div class="input-group">
              <input 
                type="range" 
                min="0" 
                max="3" 
                step="0.1"
                v-model="paragraphSpacingValue" 
                @input="updateParagraphSpacing"
                class="range-input"
              />
              <input 
                type="text" 
                v-model="currentStyles.paragraphSpacing" 
                @change="updateStyle('paragraphSpacing', currentStyles.paragraphSpacing)"
                @blur="validateSpacing"
                class="text-input"
                placeholder="1em"
              />
            </div>
          </div>
          <div class="style-item">
            <label>首行缩进：</label>
            <div class="input-group">
              <input 
                type="range" 
                min="0" 
                max="4" 
                step="0.5"
                v-model="textIndentValue" 
                @input="updateTextIndent"
                class="range-input"
              />
              <input 
                type="text" 
                v-model="currentStyles.textIndent" 
                @change="updateStyle('textIndent', currentStyles.textIndent)"
                @blur="validateSpacing"
                class="text-input"
                placeholder="2em"
              />
            </div>
          </div>
        </div>
        
        <div class="style-section">
          <h4>对齐设置</h4>
          <div class="style-item">
            <label>文本对齐：</label>
            <div class="button-group">
              <button 
                v-for="align in textAlignOptions" 
                :key="align.value"
                @click="updateStyle('textAlign', align.value)"
                :class="['align-btn', { active: currentStyles.textAlign === align.value }]"
                :title="align.label"
              >
                {{ align.icon }}
              </button>
            </div>
          </div>
        </div>
        
        <div class="style-section">
          <h4>高级设置</h4>
          <div class="style-item">
            <label>最大宽度：</label>
            <select v-model="currentStyles.maxWidth" @change="updateStyle('maxWidth', currentStyles.maxWidth)">
              <option value="none">无限制</option>
              <option value="600px">600px</option>
              <option value="700px">700px</option>
              <option value="800px">800px</option>
              <option value="900px">900px</option>
              <option value="90%">90%</option>
              <option value="95%">95%</option>
            </select>
          </div>
          <div class="style-item">
            <label>字符间距：</label>
            <input 
              type="text" 
              v-model="currentStyles.letterSpacing" 
              @change="updateStyle('letterSpacing', currentStyles.letterSpacing)"
              @blur="validateSpacing"
              class="text-input"
              placeholder="normal"
            />
          </div>
          <div class="style-item">
            <label>词间距：</label>
            <input 
              type="text" 
              v-model="currentStyles.wordSpacing" 
              @change="updateStyle('wordSpacing', currentStyles.wordSpacing)"
              @blur="validateSpacing"
              class="text-input"
              placeholder="normal"
            />
          </div>
        </div>
      </div>
      <div class="style-panel-footer">
        <button @click="resetStyles" class="reset-btn">🔄 重置默认</button>
        <button @click="exportStyles" class="export-btn">💾 导出配置</button>
        <button @click="importStyles" class="import-btn">📂 导入配置</button>
      </div>
    </div>
    
    <div class="content-container">
      <!-- 章节内容现在由父组件App.vue提供 -->
      <!-- 章节内容容器，始终存在但为空 -->
      <div id="epub-chapter-container" class="chapter-render-area"></div>
    </div>
    
    <!-- 标记工具栏 -->
    <div id="annotation-toolbar" class="annotation-toolbar">
      <button @click="createHighlight" class="tool-btn" title="高亮">
        🟨 高亮
      </button>
      <div class="underline-btn-container">
        <button @click="toggleUnderlineMenu" class="tool-btn underline-main-btn" title="下划线">
          U̲ 下划线
        </button>
        <div v-if="showUnderlineMenu" class="underline-menu">
          <div @click="createUnderline('solid')" class="underline-option" title="实线">
            <svg width="40" height="10">
              <line x1="0" y1="8" x2="40" y2="8" stroke="#2196f3" stroke-width="2"/>
            </svg>
            <span>实线</span>
          </div>
          <div @click="createUnderline('dashed')" class="underline-option" title="虚线">
            <svg width="40" height="10">
              <line x1="0" y1="8" x2="40" y2="8" stroke="#2196f3" stroke-width="2" stroke-dasharray="8,4"/>
            </svg>
            <span>虚线</span>
          </div>
          <div @click="createUnderline('dotted')" class="underline-option" title="点线">
            <svg width="40" height="10">
              <line x1="0" y1="8" x2="40" y2="8" stroke="#2196f3" stroke-width="2" stroke-dasharray="2,3" stroke-linecap="round"/>
            </svg>
            <span>点线</span>
          </div>
          <div @click="createUnderline('wavy')" class="underline-option" title="波浪线">
            <svg width="40" height="10">
              <path d="M 0 8 Q 10 3, 20 8 T 40 8" stroke="#2196f3" stroke-width="2" fill="none"/>
            </svg>
            <span>波浪线</span>
          </div>
          <div @click="createUnderline('double')" class="underline-option" title="双线">
            <svg width="40" height="12">
              <line x1="0" y1="6" x2="40" y2="6" stroke="#2196f3" stroke-width="2"/>
              <line x1="0" y1="9" x2="40" y2="9" stroke="#2196f3" stroke-width="2"/>
            </svg>
            <span>双线</span>
          </div>
          <div @click="createUnderline('thick')" class="underline-option" title="粗线">
            <svg width="40" height="10">
              <rect x="0" y="6" width="40" height="4" fill="#2196f3"/>
            </svg>
            <span>粗线</span>
          </div>
        </div>
      </div>
      <button @click="createNote" class="tool-btn" title="笔记">
        📝 笔记
      </button>
      <button @click="createBookmark" class="tool-btn" title="书签">
        🔖 书签
      </button>
    </div>
    
    <!-- 标记列表弹窗 -->
    <div v-if="showAnnotationModal" class="annotation-modal" @click.self="closeAnnotationModal">
      <div class="annotation-modal-content">
        <div class="annotation-modal-header">
          <h3>标记列表</h3>
          <button @click="closeAnnotationModal" class="close-btn">×</button>
        </div>
        <div class="annotation-modal-body">
          <div v-if="annotations.length === 0" class="no-annotations">
            暂无标记
          </div>
          <div v-else class="annotation-list">
            <div v-for="annotation in annotations" :key="annotation.id" class="annotation-item">
              <div class="annotation-type">
                <span :class="['type-icon', annotation.type]">{{ getAnnotationIcon(annotation.type) }}</span>
                <span class="type-text">{{ getAnnotationTypeName(annotation.type) }}</span>
              </div>
              <div class="annotation-text">{{ annotation.text.substring(0, 100) }}{{ annotation.text.length > 100 ? '...' : '' }}</div>
              <div v-if="annotation.note" class="annotation-note">📝 {{ annotation.note }}</div>
              <div class="annotation-actions">
                <button @click="jumpToAnnotation(annotation)" class="action-btn">跳转</button>
                <button @click="removeAnnotation(annotation.id)" class="action-btn delete">删除</button>
              </div>
            </div>
          </div>
        </div>
        <div class="annotation-modal-footer">
          <button @click="exportAnnotations" class="export-btn">导出标记</button>
          <button @click="importAnnotations" class="import-btn">导入标记</button>
        </div>
      </div>
    </div>
    
    <!-- 调试信息弹窗 -->
    <div v-if="showDebugModal" class="annotation-modal" @click.self="closeDebugModal">
      <div class="annotation-modal-content debug-modal">
        <div class="annotation-modal-header">
          <h3>🐛 标记调试信息</h3>
          <button @click="closeDebugModal" class="close-btn">×</button>
        </div>
        <div class="annotation-modal-body">
          <div class="debug-section">
            <h4>存储统计</h4>
            <div class="debug-info">
              <p><strong>总标记数：</strong> {{ debugStats.count }}</p>
              <p><strong>存储大小：</strong> {{ (debugStats.size / 1024).toFixed(2) }} KB</p>
              <p><strong>最后修改：</strong> {{ debugStats.lastModified || '无' }}</p>
            </div>
          </div>
          
          <div class="debug-section">
            <h4>当前章节标记</h4>
            <div class="debug-info">
              <p><strong>章节ID：</strong> {{ currentChapterId || '未知' }}</p>
              <p><strong>当前章节数：</strong> {{ currentAnnotations.length }}</p>
            </div>
          </div>
          
          <div class="debug-section">
            <h4>标记分类统计</h4>
            <div class="debug-info">
              <p><strong>🟨 高亮：</strong> {{ getTypeCount('highlight') }} 个</p>
              <p><strong>U̲ 下划线：</strong> {{ getTypeCount('underline') }} 个</p>
              <p><strong>📝 笔记：</strong> {{ getTypeCount('note') }} 个</p>
              <p><strong>🔖 书签：</strong> {{ getTypeCount('bookmark') }} 个</p>
            </div>
          </div>
          
          <div class="debug-section">
            <h4>下划线样式分布</h4>
            <div class="debug-info">
              <p><strong>实线：</strong> {{ getUnderlineStyleCount('solid') }} 个</p>
              <p><strong>虚线：</strong> {{ getUnderlineStyleCount('dashed') }} 个</p>
              <p><strong>点线：</strong> {{ getUnderlineStyleCount('dotted') }} 个</p>
              <p><strong>波浪线：</strong> {{ getUnderlineStyleCount('wavy') }} 个</p>
              <p><strong>双线：</strong> {{ getUnderlineStyleCount('double') }} 个</p>
              <p><strong>粗线：</strong> {{ getUnderlineStyleCount('thick') }} 个</p>
            </div>
          </div>
          
          <div class="debug-section">
            <h4>原始数据</h4>
            <div class="debug-json">
              <pre>{{ JSON.stringify(annotations, null, 2) }}</pre>
            </div>
          </div>
        </div>
        <div class="annotation-modal-footer">
          <button @click="clearAllAnnotations" class="danger-btn">🗑️ 清空所有标记</button>
          <button @click="resetRenderState" class="reset-btn">🔧 重置状态</button>
          <button @click="forceRerenderAnnotations" class="rerender-btn">🔄 重新渲染</button>
          <button @click="exportDebugData" class="export-btn">💾 导出调试数据</button>
          <button @click="refreshDebugInfo" class="refresh-btn">📊 刷新统计</button>
        </div>
      </div>
    </div>
    
    <div class="viewer-footer">
      <span>Chapter {{ currentChapterIndex + 1 }} of {{ chapters.length }}</span>
      <span v-if="annotationsEnabled && annotations.length > 0" class="annotation-count">
        ({{ annotations.length }} 个标记)
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, computed } from 'vue';
import { EpubReader, EpubChapter, Annotation, AnnotationType, ReadingStyles } from 'epub-reader-src';

interface Props {
  reader: EpubReader;
  theme?: string;
}

const props = withDefaults(defineProps<Props>(), {
  theme: 'light'
});

const chapters = ref<EpubChapter[]>(props.reader.getChapters());
const currentChapterIndex = ref(props.reader.getCurrentChapterIndex());
const hasPreviousChapter = ref(props.reader.hasPreviousChapter());
const hasNextChapter = ref(props.reader.hasNextChapter());

// 标记功能相关状态
const annotationsEnabled = ref(false);
const showAnnotationModal = ref(false);
const showDebugModal = ref(false);
const annotations = ref<Annotation[]>([]);
const debugStats = ref({ count: 0, size: 0, lastModified: null as string | null });

// 下划线样式菜单状态
const showUnderlineMenu = ref(false);

// 样式控制相关状态
const stylePanelVisible = ref(false);
const currentStyles = ref<ReadingStyles>({});
const fontSizeValue = ref(16);
const textColorValue = ref('#333333');
const backgroundColorValue = ref('#ffffff');
const lineHeightValue = ref(1.6);
const paragraphSpacingValue = ref(1);
const textIndentValue = ref(2);

// 文本对齐选项
const textAlignOptions = [
  { value: 'left', icon: '⬅️', label: '左对齐' },
  { value: 'center', icon: '⬆️', label: '居中对齐' },
  { value: 'right', icon: '➡️', label: '右对齐' },
  { value: 'justify', icon: '↔️', label: '两端对齐' }
];

// 防重复渲染状态
let isRenderingAnnotations = false;
let lastRenderedChapterId: string | null = null;
let renderTimeoutId: number | null = null;

// 计算当前章节的标记
const currentAnnotations = computed(() => {
  const currentChapter = chapters.value[currentChapterIndex.value];
  return annotations.value.filter(ann => ann.chapterId === currentChapter?.id);
});

// 计算当前章节ID
const currentChapterId = computed(() => {
  const currentChapter = chapters.value[currentChapterIndex.value];
  return currentChapter?.id || 'unknown';
});

const onPreviousChapter = async () => {
  if (!props.reader.hasPreviousChapter()) return;
  
  try {
    await props.reader.previousChapter({
      showLoading: true,
      onError: (error) => {
        console.error('上一章加载失败:', error);
      },
      onSuccess: () => {
        updateNavigationState();
      }
    });
  } catch (error) {
    console.error('Failed to load previous chapter:', error);
  }
};

const onNextChapter = async () => {
  if (!props.reader.hasNextChapter()) return;
  
  try {
    await props.reader.nextChapter({
      showLoading: true,
      onError: (error) => {
        console.error('下一章加载失败:', error);
      },
      onSuccess: () => {
        updateNavigationState();
      }
    });
  } catch (error) {
    console.error('Failed to load next chapter:', error);
  }
};

const onChapterChange = async () => {
  try {
    await props.reader.loadChapterByIndex(currentChapterIndex.value, {
      showLoading: true,
      onError: (error) => {
        console.error('章节加载失败:', error);
      },
      onSuccess: () => {
        updateNavigationState();
      }
    });
  } catch (error) {
    console.error('Failed to load chapter:', error);
  }
};

const getChapterTitle = (chapter: EpubChapter, index: number): string => {
  const toc = props.reader.getTableOfContents();
  const tocItem = toc.find(item => item.href.includes(chapter.href.split('/').pop() || ''));
  return tocItem?.title || `Chapter ${index + 1}`;
};

const onRenderError = (event: Event) => {
  console.error('Rendering error:', event);
};

const updateNavigationState = () => {
  const oldChapterIndex = currentChapterIndex.value;
  
  currentChapterIndex.value = props.reader.getCurrentChapterIndex();
  hasPreviousChapter.value = props.reader.hasPreviousChapter();
  hasNextChapter.value = props.reader.hasNextChapter();
  
  // 更新标记列表
  if (annotationsEnabled.value) {
    loadAnnotations();
    
    // 只有章节真正改变时才重新渲染标记
    if (oldChapterIndex !== currentChapterIndex.value) {
      console.log(`📖 章节从 ${oldChapterIndex} 切换到 ${currentChapterIndex.value}`);
      
      // 重置渲染状态，允许新章节的渲染
      lastRenderedChapterId = null;
      
      // 延迟执行重渲染，确保章节完全加载
      setTimeout(() => {
        forceRerenderChapterAnnotations();
      }, 500);
    }
  }
};

// CFI相关方法
const jumpToCFI = async (cfi: string) => {
  try {
    await props.reader.jumpToCFI(cfi, {
      showLoading: true,
      highlightTarget: true,
      highlightDuration: 3000,
      scrollBehavior: 'smooth',
      onError: (error) => {
        console.error('CFI跳转失败:', error);
      },
      onSuccess: () => {
        console.log('CFI跳转成功:', cfi);
      }
    });
  } catch (error) {
    console.error('CFI跳转异常:', error);
  }
};

const getCurrentCFI = () => {
  try {
    const cfi = props.reader.generateCFI();
    console.log('当前CFI:', cfi);
    return cfi;
  } catch (error) {
    console.error('生成CFI失败:', error);
    return null;
  }
};

const getCurrentCFICursor = () => {
  try {
    const cursor = props.reader.getCurrentCFICursor();
    console.log('当前CFI光标:', cursor);
    return cursor;
  } catch (error) {
    console.error('获取CFI光标失败:', error);
    return null;
  }
};

// 确保DOM元素存在并清理样式
onUnmounted(() => {
  const styleElement = document.getElementById('epub-chapter-styles');
  if (styleElement) {
    document.head.removeChild(styleElement);
  }
});

// ==================== 标记功能方法 ====================

/**
 * 初始化标记功能
 */
const initializeAnnotations = () => {
  if (!annotationsEnabled.value) return;
  
  console.log('🔧 初始化标记功能...');
  
  try {
    // 防止重复初始化
    const container = document.getElementById('epub-chapter-container');
    if (!container) {
      console.warn('标记容器不存在，延迟初始化...');
      setTimeout(initializeAnnotations, 200);
      return;
    }
    
    // 检查是否已经初始化过
    const existingSvg = container.querySelector('.epub-annotation-overlay');
    const hasToolbar = document.getElementById('annotation-toolbar');
    
    if (existingSvg && hasToolbar) {
      console.log('⏸️ 标记功能已初始化过，跳过重复初始化');
      return;
    }
    
    // 先清理现有的SVG覆盖层（如果有）
    if (existingSvg) {
      console.log('清理现有SVG覆盖层');
      existingSvg.remove();
    }
    
    props.reader.setupAnnotations({
      containerId: 'epub-chapter-container',
      toolbarId: 'annotation-toolbar',
      onAnnotationCreated: handleAnnotationCreated,
      onAnnotationRemoved: handleAnnotationRemoved,
      onAnnotationUpdated: handleAnnotationUpdated
    });
    
    // 加载标记数据
    loadAnnotations();
    
    // 延迟渲染当前章节的标记，确保DOM已经完全加载
    setTimeout(() => {
      const currentChapter = chapters.value[currentChapterIndex.value];
      if (currentChapter) {
        const chapterAnnotations = props.reader.getAnnotations(currentChapter.id);
        console.log(`📝 章节 ${currentChapter.id} 应该有 ${chapterAnnotations.length} 个标记`);
        
        // 设置当前章节已渲染标记，避免重复渲染
        lastRenderedChapterId = currentChapter.id;
      }
    }, 300);
    
  } catch (error) {
    console.error('初始化标记功能失败:', error);
  }
};

/**
 * 加载标记列表
 */
const loadAnnotations = () => {
  annotations.value = props.reader.getAnnotations();
};

/**
 * 切换标记功能
 */
const toggleAnnotations = () => {
  annotationsEnabled.value = !annotationsEnabled.value;
  
  if (annotationsEnabled.value) {
    initializeAnnotations();
  } else {
    // 禁用标记功能，可以在这里添加清理逻辑
  }
};

/**
 * 创建高亮标记
 */
const createHighlight = async () => {
  try {
    await props.reader.createAnnotationFromSelection('highlight', { color: '#ffeb3b' });
  } catch (error) {
    console.error('创建高亮失败:', error);
    alert('创建高亮失败: ' + (error instanceof Error ? error.message : String(error)));
  }
};

/**
 * 切换下划线菜单
 */
const toggleUnderlineMenu = () => {
  showUnderlineMenu.value = !showUnderlineMenu.value;
};

/**
 * 创建下划线标记
 */
const createUnderline = async (style: string = 'solid') => {
  try {
    // 关闭下划线菜单
    showUnderlineMenu.value = false;
    
    // 根据样式配置参数
    const underlineConfig = getUnderlineConfig(style);
    
    await props.reader.createAnnotationFromSelection('underline', {
      color: '#2196f3',
      underlineStyle: style,
      underlineConfig
    });
  } catch (error) {
    console.error('创建下划线失败:', error);
    alert('创建下划线失败: ' + (error instanceof Error ? error.message : String(error)));
  }
};

/**
 * 获取下划线配置
 */
const getUnderlineConfig = (style: string) => {
  const configs = {
    solid: { style: 'solid' as any, thickness: 2 },
    dashed: { style: 'dashed' as any, thickness: 2, dashPattern: '8,4' },
    dotted: { style: 'dotted' as any, thickness: 2 },
    wavy: { style: 'wavy' as any, thickness: 2, waveAmplitude: 3, waveFrequency: 0.1 },
    double: { style: 'double' as any, thickness: 2, spacing: 3 },
    thick: { style: 'thick' as any, thickness: 4 }
  };
  
  return configs[style] || configs.solid;
};

/**
 * 创建笔记标记
 */
const createNote = async () => {
  const note = prompt('请输入笔记内容：');
  if (note) {
    try {
      await props.reader.createAnnotationFromSelection('note', { note, color: '#4caf50' });
    } catch (error) {
      console.error('创建笔记失败:', error);
      alert('创建笔记失败: ' + (error instanceof Error ? error.message : String(error)));
    }
  }
};

/**
 * 创建书签标记
 */
const createBookmark = async () => {
  try {
    await props.reader.createAnnotationFromSelection('bookmark', { color: '#ff9800' });
  } catch (error) {
    console.error('创建书签失败:', error);
    alert('创建书签失败: ' + (error instanceof Error ? error.message : String(error)));
  }
};

/**
 * 移除标记
 */
const removeAnnotation = async (id: string) => {
  if (confirm('确定要删除这个标记吗？')) {
    try {
      await props.reader.removeAnnotation(id);
      loadAnnotations(); // 重新加载列表
    } catch (error) {
      console.error('删除标记失败:', error);
      alert('删除标记失败: ' + (error instanceof Error ? error.message : String(error)));
    }
  }
};

/**
 * 跳转到标记位置
 */
const jumpToAnnotation = async (annotation: Annotation) => {
  try {
    // 这里可以根据CFI跳转到标记位置
    console.log('跳转到标记:', annotation);
    // 实际实现需要调用 reader.jumpToCFI(annotation.cfi.path)
  } catch (error) {
    console.error('跳转失败:', error);
  }
};

/**
 * 导出标记
 */
const exportAnnotations = () => {
  try {
    const data = props.reader.exportAnnotations();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `epub-annotations-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('导出失败:', error);
    alert('导出失败: ' + (error instanceof Error ? error.message : String(error)));
  }
};

/**
 * 导入标记
 */
const importAnnotations = () => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  
  input.onchange = async (event) => {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    
    try {
      const text = await file.text();
      const merge = confirm('是否与现有标记合并？(点击"确定"合并，点击"取消"替换)');
      
      await props.reader.importAnnotations(text, merge);
      loadAnnotations();
      
      alert('标记导入成功！');
      closeAnnotationModal();
    } catch (error) {
      console.error('导入失败:', error);
      alert('导入失败: ' + (error instanceof Error ? error.message : String(error)));
    }
  };
  
  input.click();
};

/**
 * 显示标记列表
 */
const showAnnotationList = () => {
  loadAnnotations();
  showAnnotationModal.value = true;
};

/**
 * 关闭标记列表
 */
const closeAnnotationModal = () => {
  showAnnotationModal.value = false;
};

/**
 * 显示调试信息
 */
const showDebugInfo = () => {
  updateDebugStats();
  showDebugModal.value = true;
};

/**
 * 关闭调试弹窗
 */
const closeDebugModal = () => {
  showDebugModal.value = false;
};

/**
 * 更新调试统计信息
 */
const updateDebugStats = () => {
  try {
    // 从localStorage获取原始数据
    const data = localStorage.getItem('epub-annotations');
    if (data) {
      const parsed = JSON.parse(data);
      debugStats.value = {
        count: Array.isArray(parsed.annotations) ? parsed.annotations.length : 0,
        size: data.length,
        lastModified: parsed.timestamp || null
      };
    } else {
      debugStats.value = { count: 0, size: 0, lastModified: null };
    }
  } catch (error) {
    console.error('获取调试统计失败:', error);
    debugStats.value = { count: 0, size: 0, lastModified: null };
  }
};

/**
 * 获取特定类型的标记数量
 */
const getTypeCount = (type: AnnotationType): number => {
  return annotations.value.filter(ann => ann.type === type).length;
};

/**
 * 获取特定下划线样式的数量
 */
const getUnderlineStyleCount = (style: string): number => {
  return annotations.value.filter(ann => 
    ann.type === 'underline' && ann.underlineConfig?.style === style
  ).length;
};

/**
 * 导出调试数据
 */
const exportDebugData = () => {
  try {
    const debugData = {
      timestamp: new Date().toISOString(),
      stats: debugStats.value,
      annotations: annotations.value,
      currentChapter: {
        id: currentChapterId.value,
        index: currentChapterIndex.value,
        annotations: currentAnnotations.value
      },
      localStorage: {
        'epub-annotations': localStorage.getItem('epub-annotations'),
        keys: Object.keys(localStorage).filter(key => key.startsWith('epub-'))
      }
    };
    
    const blob = new Blob([JSON.stringify(debugData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `epub-debug-${new Date().toISOString().split('T')[0]}-${Date.now()}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('导出调试数据失败:', error);
    alert('导出调试数据失败: ' + (error instanceof Error ? error.message : String(error)));
  }
};

/**
 * 清空所有标记数据
 */
const clearAllAnnotations = () => {
  if (confirm('⚠️ 这将清空所有标记数据，包括本地存储的数据！\n\n确定要继续吗？')) {
    try {
      // 清空localStorage中的标记数据
      localStorage.removeItem('epub-annotations');
      
      // 清空内存中的数据
      annotations.value = [];
      
      // 清空SVG覆盖层
      if (props.reader && annotationsEnabled.value) {
        // 重新初始化以清除SVG层
        initializeAnnotations();
      }
      
      // 更新调试信息
      updateDebugStats();
      
      alert('✅ 所有标记数据已清空！');
      closeDebugModal();
    } catch (error) {
      console.error('清空标记数据失败:', error);
      alert('清空标记数据失败: ' + (error instanceof Error ? error.message : String(error)));
    }
  }
};

/**
 * 刷新调试信息
 */
const refreshDebugInfo = () => {
  loadAnnotations();
  updateDebugStats();
};

/**
 * 重置渲染状态（调试用）
 */
const resetRenderState = () => {
  console.log('🔄 重置渲染状态...');
  
  // 清理定时器
  if (renderTimeoutId) {
    clearTimeout(renderTimeoutId);
    renderTimeoutId = null;
  }
  
  // 重置状态
  isRenderingAnnotations = false;
  lastRenderedChapterId = null;
  
  // 清理SVG层
  const existingSvg = document.querySelector('.epub-annotation-overlay');
  if (existingSvg) {
    existingSvg.remove();
  }
  
  console.log('✅ 渲染状态已重置');
  
  // 重新初始化
  if (annotationsEnabled.value) {
    setTimeout(() => {
      initializeAnnotations();
    }, 100);
  }
};

/**
 * 强制重新渲染章节标记（章节切换时使用）
 */
const forceRerenderChapterAnnotations = () => {
  if (!annotationsEnabled.value || !props.reader) return;
  
  // 防重复机制
  const currentChapter = chapters.value[currentChapterIndex.value];
  const currentChapterId = currentChapter?.id;
  
  if (isRenderingAnnotations) {
    console.log('⏸️ 标记渲染进行中，跳过重复请求');
    return;
  }
  
  if (lastRenderedChapterId === currentChapterId) {
    console.log('⏸️ 当前章节已渲染过，跳过重复渲染');
    return;
  }
  
  try {
    console.log('🔄 章节切换，重新渲染标记...');
    isRenderingAnnotations = true;
    
    // 清理之前的超时
    if (renderTimeoutId) {
      clearTimeout(renderTimeoutId);
      renderTimeoutId = null;
    }
    
    // 延迟执行，确保章节内容完全加载
    renderTimeoutId = window.setTimeout(() => {
      // 检查章节内容是否存在
      const container = document.getElementById('epub-chapter-container');
      if (!container) {
        console.warn('章节容器不存在，延迟重试...');
        isRenderingAnnotations = false;
        setTimeout(forceRerenderChapterAnnotations, 200);
        return;
      }
      
      // 检查是否有实际内容
      const content = container.querySelector('.epub-chapter-content');
      if (!content || content.children.length === 0) {
        console.warn('章节内容为空，延迟重试...');
        isRenderingAnnotations = false;
        setTimeout(forceRerenderChapterAnnotations, 200);
        return;
      }
      
      // 清理现有的SVG覆盖层
      const existingSvg = container.querySelector('.epub-annotation-overlay');
      if (existingSvg) {
        console.log('清理现有SVG覆盖层');
        existingSvg.remove();
      }
      
      // 记录当前渲染的章节ID
      lastRenderedChapterId = currentChapterId;
      
      // 重新创建SVG覆盖层
      setTimeout(() => {
        try {
          if (!currentChapter) {
            console.warn('当前章节信息不存在');
            isRenderingAnnotations = false;
            return;
          }
          
          // 调用reader的标记渲染方法
          const chapterAnnotations = props.reader.getAnnotations(currentChapter.id);
          console.log(`章节 ${currentChapter.id} 有 ${chapterAnnotations.length} 个标记`);
          
          if (chapterAnnotations.length > 0) {
            // 直接调用渲染，而不是重新初始化
            console.log('🎨 直接渲染标记，避免重新初始化...');
            initializeAnnotations();
          } else {
            console.log('当前章节没有标记');
          }
          
        } catch (error) {
          console.error('重新渲染标记失败:', error);
        } finally {
          isRenderingAnnotations = false;
        }
      }, 100);
      
    }, 300); // 增加延迟时间确保DOM完全加载
    
  } catch (error) {
    console.error('章节标记重渲染失败:', error);
    isRenderingAnnotations = false;
  }
};

/**
 * 强制重新渲染所有标记（手动触发）
 */
const forceRerenderAnnotations = () => {
  if (!annotationsEnabled.value || !props.reader) return;
  
  try {
    console.log('🔄 强制重新渲染所有标记...');
    
    // 清理现有的SVG覆盖层
    const existingSvg = document.querySelector('.epub-annotation-overlay');
    if (existingSvg) {
      existingSvg.remove();
    }
    
    // 重新初始化标记功能
    setTimeout(() => {
      initializeAnnotations();
      
      // 显示成功消息
      setTimeout(() => {
        console.log('✅ 标记重新渲染完成');
        alert(`✅ 重新渲染完成！\n当前章节有 ${currentAnnotations.value.length} 个标记`);
      }, 500);
    }, 100);
    
  } catch (error) {
    console.error('强制重新渲染失败:', error);
    alert('❌ 重新渲染失败: ' + (error instanceof Error ? error.message : String(error)));
  }
};

/**
 * 获取标记图标
 */
const getAnnotationIcon = (type: AnnotationType): string => {
  const icons = {
    highlight: '🟨',
    underline: 'U̲',
    note: '📝',
    bookmark: '🔖'
  };
  return icons[type] || '📌';
};

/**
 * 获取标记类型名称
 */
const getAnnotationTypeName = (type: AnnotationType): string => {
  const names = {
    highlight: '高亮',
    underline: '下划线',
    note: '笔记',
    bookmark: '书签'
  };
  return names[type] || '未知';
};

/**
 * 标记创建回调
 */
const handleAnnotationCreated = (annotation: Annotation) => {
  console.log('标记已创建:', annotation);
  loadAnnotations();
};

/**
 * 标记移除回调
 */
const handleAnnotationRemoved = (id: string) => {
  console.log('标记已移除:', id);
  loadAnnotations();
};

/**
 * 标记更新回调
 */
const handleAnnotationUpdated = (annotation: Annotation) => {
  console.log('标记已更新:', annotation);
  loadAnnotations();
};

// ==================== 样式控制方法 ====================

/**
 * 初始化样式控制
 */
const initializeStyles = () => {
  try {
    // 获取当前样式
    currentStyles.value = props.reader.getReadingStyles();
    
    // 更新控件的显示值
    updateControlValues();
    
    // 监听样式更新事件
    props.reader.onStyleUpdate(handleStyleUpdate);
    
    console.log('✅ 样式控制初始化完成:', currentStyles.value);
  } catch (error) {
    console.error('初始化样式控制失败:', error);
  }
};

/**
 * 更新控件显示值
 */
const updateControlValues = () => {
  const styles = currentStyles.value;
  
  // 字号
  const fontSize = parseFloat(styles.fontSize?.replace('px', '') || '16');
  fontSizeValue.value = fontSize;
  
  // 颜色
  textColorValue.value = styles.color || '#333333';
  backgroundColorValue.value = styles.backgroundColor || '#ffffff';
  
  // 行高
  lineHeightValue.value = parseFloat(styles.lineHeight || '1.6');
  
  // 段间距
  const paragraphSpacing = parseFloat(styles.paragraphSpacing?.replace('em', '') || '1');
  paragraphSpacingValue.value = paragraphSpacing;
  
  // 首行缩进
  const textIndent = parseFloat(styles.textIndent?.replace('em', '') || '2');
  textIndentValue.value = textIndent;
};

/**
 * 切换样式面板显示
 */
const toggleStylePanel = () => {
  stylePanelVisible.value = !stylePanelVisible.value;
  
  if (stylePanelVisible.value) {
    // 打开面板时更新当前样式
    currentStyles.value = props.reader.getReadingStyles();
    updateControlValues();
  }
};

/**
 * 更新单个样式
 */
const updateStyle = async (key: keyof ReadingStyles, value: string) => {
  try {
    console.log(`🎨 更新样式: ${key} = ${value}`);
    
    const updatedStyles = await props.reader.setReadingStyle(key, value);
    currentStyles.value = updatedStyles;
    
    // 更新控件的显示值
    updateControlValues();
    
  } catch (error) {
    console.error('更新样式失败:', error);
    alert(`样式设置失败: ${error instanceof Error ? error.message : String(error)}`);
    
    // 恢复控件的显示值
    currentStyles.value = props.reader.getReadingStyles();
    updateControlValues();
  }
};

/**
 * 更新字号（滑块）
 */
const updateFontSize = () => {
  currentStyles.value.fontSize = `${fontSizeValue.value}px`;
  updateStyle('fontSize', `${fontSizeValue.value}px`);
};

/**
 * 验证字号输入
 */
const validateFontSize = () => {
  const value = currentStyles.value.fontSize;
  if (!/^\d+(px|em|rem|%|pt)$/.test(value)) {
    currentStyles.value.fontSize = '16px';
    fontSizeValue.value = 16;
    updateStyle('fontSize', '16px');
  }
};

/**
 * 更新文字颜色
 */
const updateTextColor = () => {
  currentStyles.value.color = textColorValue.value;
  updateStyle('color', textColorValue.value);
};

/**
 * 更新背景颜色
 */
const updateBackgroundColor = () => {
  currentStyles.value.backgroundColor = backgroundColorValue.value;
  updateStyle('backgroundColor', backgroundColorValue.value);
};

/**
 * 验证颜色输入
 */
const validateColor = () => {
  const color = currentStyles.value.color;
  if (!/^#[0-9A-Fa-f]{6}$/.test(color) && !/^#[0-9A-Fa-f]{3}$/.test(color)) {
    currentStyles.value.color = '#333333';
    textColorValue.value = '#333333';
    updateStyle('color', '#333333');
  }
};

/**
 * 更新行高
 */
const updateLineHeight = () => {
  currentStyles.value.lineHeight = lineHeightValue.value.toString();
  updateStyle('lineHeight', lineHeightValue.value.toString());
};

/**
 * 验证行高输入
 */
const validateLineHeight = () => {
  const value = currentStyles.value.lineHeight;
  if (!/^\d+(\.\d+)?$/.test(value) && !/^\d+%$/.test(value)) {
    currentStyles.value.lineHeight = '1.6';
    lineHeightValue.value = 1.6;
    updateStyle('lineHeight', '1.6');
  }
};

/**
 * 更新段间距
 */
const updateParagraphSpacing = () => {
  currentStyles.value.paragraphSpacing = `${paragraphSpacingValue.value}em`;
  updateStyle('paragraphSpacing', `${paragraphSpacingValue.value}em`);
};

/**
 * 更新首行缩进
 */
const updateTextIndent = () => {
  currentStyles.value.textIndent = `${textIndentValue.value}em`;
  updateStyle('textIndent', `${textIndentValue.value}em`);
};

/**
 * 验证间距输入
 */
const validateSpacing = () => {
  const spacing = currentStyles.value.paragraphSpacing;
  if (!/^\d+(px|em|rem|pt)$/.test(spacing)) {
    currentStyles.value.paragraphSpacing = '1em';
    paragraphSpacingValue.value = 1;
    updateStyle('paragraphSpacing', '1em');
  }
};

/**
 * 重置样式
 */
const resetStyles = async () => {
  if (confirm('确定要重置所有样式为默认值吗？')) {
    try {
      const defaultStyles = await props.reader.resetReadingStyles();
      currentStyles.value = defaultStyles;
      updateControlValues();
      
      console.log('✅ 样式已重置为默认值');
      alert('样式已重置为默认值！');
    } catch (error) {
      console.error('重置样式失败:', error);
      alert(`重置样式失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
};

/**
 * 导出样式配置
 */
const exportStyles = () => {
  try {
    const config = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      styles: currentStyles.value
    };
    
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `epub-styles-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
    console.log('✅ 样式配置已导出');
  } catch (error) {
    console.error('导出样式配置失败:', error);
    alert('导出样式配置失败');
  }
};

/**
 * 导入样式配置
 */
const importStyles = () => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  
  input.onchange = async (event) => {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    
    try {
      const text = await file.text();
      const config = JSON.parse(text);
      
      if (!config.styles) {
        throw new Error('配置文件格式无效');
      }
      
      await props.reader.setReadingStyles(config.styles);
      currentStyles.value = props.reader.getReadingStyles();
      updateControlValues();
      
      console.log('✅ 样式配置已导入');
      alert('样式配置导入成功！');
    } catch (error) {
      console.error('导入样式配置失败:', error);
      alert(`导入配置失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  };
  
  input.click();
};

/**
 * 处理样式更新事件
 */
const handleStyleUpdate = (styles: ReadingStyles) => {
  currentStyles.value = styles;
  updateControlValues();
  console.log('🎨 样式已更新:', styles);
};

// 组件挂载时初始化
onMounted(() => {
  // 可以在这里自动启用标记功能
  // annotationsEnabled.value = true;
  // initializeAnnotations();
  
  // 初始化样式控制
  initializeStyles();
  
  // 添加点击外部关闭下划线菜单
  document.addEventListener('click', handleOutsideClick);
});

// 组件卸载时清理
onUnmounted(() => {
  // 移除全局点击事件
  document.removeEventListener('click', handleOutsideClick);
  
  // 清理标记相关的定时器
  if (renderTimeoutId) {
    clearTimeout(renderTimeoutId);
    renderTimeoutId = null;
  }
  
  // 重置渲染状态
  isRenderingAnnotations = false;
  lastRenderedChapterId = null;
  
  // 清理SVG覆盖层
  const existingSvg = document.querySelector('.epub-annotation-overlay');
  if (existingSvg) {
    existingSvg.remove();
  }
  
  // 清理样式管理器
  try {
    const styleManager = props.reader.getStyleManager();
    if (styleManager) {
      styleManager.destroy();
    }
  } catch (error) {
    console.warn('清理样式管理器失败:', error);
  }
  
  console.log('🧹 组件卸载，清理标记和样式相关资源');
});

/**
 * 处理点击外部关闭菜单
 */
const handleOutsideClick = (event: MouseEvent) => {
  const target = event.target as HTMLElement;
  
  // 检查点击是否在下划线菜单或按钮外
  const underlineBtn = target.closest('.underline-btn-container');
  const toolbar = target.closest('.annotation-toolbar');
  
  if (!underlineBtn && !toolbar && showUnderlineMenu.value) {
    showUnderlineMenu.value = false;
  }
};

// 暴露方法给父组件
defineExpose({
  setCurrentChapter: (index: number) => {
    if (index >= 0 && index < chapters.value.length) {
      currentChapterIndex.value = index;
    }
  },
  jumpToCFI,
  getCurrentCFI,
  getCurrentCFICursor,
  toggleAnnotations,
  createHighlight,
  createUnderline,
  createNote,
  createBookmark,
  toggleStylePanel,
  updateStyle,
  resetStyles,
  exportStyles,
  importStyles,
  annotations: currentAnnotations,
  currentStyles: currentStyles
});


</script>

<style scoped>
.epub-viewer {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  display: flex;
  flex-direction: column;
  height: calc(100vh - 200px);
}

.viewer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  border-bottom: 1px solid #eee;
  gap: 1rem;
}

.nav-btn {
  background: #007bff;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  white-space: nowrap;
}

.nav-btn:hover:not(:disabled) {
  background: #0056b3;
}

.nav-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.chapter-select {
  flex: 1;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.9rem;
}

.content-container {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
}

.chapter-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 2px dashed #ddd;
  color: #666;
  font-style: italic;
}

.viewer-footer {
  padding: 1rem;
  border-top: 1px solid #eee;
  text-align: center;
  color: #666;
  font-size: 0.9rem;
}

/* 标记功能样式 */
.annotation-controls {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.annotation-toggle {
  background: #6c757d;
  color: white;
  border: none;
  padding: 0.4rem 0.8rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.2s;
}

.annotation-toggle:hover {
  background: #5a6268;
}

.annotation-toggle.active {
  background: #28a745;
}

.annotation-toggle.active:hover {
  background: #218838;
}

.annotation-list-btn {
  background: #17a2b8;
  color: white;
  border: none;
  padding: 0.4rem 0.8rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.85rem;
  transition: background-color 0.2s;
}

.annotation-list-btn:hover {
  background: #138496;
}

.debug-btn {
  background: #6c757d;
  color: white;
  border: none;
  padding: 0.4rem 0.8rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.85rem;
  transition: background-color 0.2s;
}

.debug-btn:hover {
  background: #5a6268;
}

/* 工具栏样式 */
.annotation-toolbar {
  display: none;
  position: fixed;
  background: white;
  border: 1px solid #ddd;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  padding: 8px;
  gap: 4px;
  z-index: 10000;
  animation: fadeIn 0.2s ease;
}

.annotation-toolbar.show {
  display: flex;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-5px); }
  to { opacity: 1; transform: translateY(0); }
}

.tool-btn {
  padding: 8px 12px;
  border: none;
  background: transparent;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.2s;
  white-space: nowrap;
}

.tool-btn:hover {
  background: #f0f0f0;
}

.tool-btn:active {
  background: #e0e0e0;
}

/* 下划线样式菜单 */
.underline-btn-container {
  position: relative;
  display: inline-block;
}

.underline-main-btn {
  position: relative;
}

.underline-main-btn::after {
  content: '▼';
  position: absolute;
  right: 4px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 8px;
  opacity: 0.7;
}

.underline-menu {
  position: absolute;
  top: 100%;
  left: 0;
  background: white;
  border: 1px solid #ddd;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  z-index: 10001;
  min-width: 120px;
  padding: 8px 0;
  margin-top: 4px;
}

.underline-option {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  cursor: pointer;
  transition: background-color 0.2s;
  gap: 8px;
}

.underline-option:hover {
  background: #f0f0f0;
}

.underline-option svg {
  flex-shrink: 0;
}

.underline-option span {
  font-size: 12px;
  color: #333;
  white-space: nowrap;
}

/* 标记列表弹窗样式 */
.annotation-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10001;
  animation: modalFadeIn 0.3s ease;
}

@keyframes modalFadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.annotation-modal-content {
  background: white;
  border-radius: 8px;
  width: 90%;
  max-width: 600px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 10px 25px rgba(0,0,0,0.2);
  animation: modalSlideIn 0.3s ease;
}

@keyframes modalSlideIn {
  from { transform: translateY(-50px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

.annotation-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid #eee;
}

.annotation-modal-header h3 {
  margin: 0;
  color: #333;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #666;
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: background-color 0.2s;
}

.close-btn:hover {
  background: #f0f0f0;
}

.annotation-modal-body {
  flex: 1;
  padding: 1rem;
  overflow-y: auto;
}

.no-annotations {
  text-align: center;
  color: #666;
  padding: 2rem;
  font-style: italic;
}

.annotation-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.annotation-item {
  border: 1px solid #eee;
  border-radius: 6px;
  padding: 1rem;
  background: #fafafa;
  transition: box-shadow 0.2s;
}

.annotation-item:hover {
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.annotation-type {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  font-weight: 600;
}

.type-icon {
  font-size: 16px;
}

.type-icon.highlight {
  color: #f9a825;
}

.type-icon.underline {
  color: #1976d2;
  text-decoration: underline;
}

.type-icon.note {
  color: #388e3c;
}

.type-icon.bookmark {
  color: #f57c00;
}

.annotation-text {
  margin-bottom: 0.5rem;
  color: #333;
  line-height: 1.4;
}

.annotation-note {
  background: #e8f5e8;
  border-left: 3px solid #4caf50;
  padding: 0.5rem;
  margin: 0.5rem 0;
  border-radius: 0 4px 4px 0;
  font-size: 0.9rem;
  color: #2e7d32;
}

.annotation-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.action-btn {
  padding: 0.3rem 0.8rem;
  border: 1px solid #ddd;
  background: white;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.2s;
}

.action-btn:hover {
  background: #f0f0f0;
}

.action-btn.delete {
  border-color: #dc3545;
  color: #dc3545;
}

.action-btn.delete:hover {
  background: #dc3545;
  color: white;
}

.annotation-modal-footer {
  display: flex;
  justify-content: space-between;
  padding: 1rem;
  border-top: 1px solid #eee;
  background: #f8f9fa;
  border-radius: 0 0 8px 8px;
}

.export-btn, .import-btn {
  padding: 0.5rem 1rem;
  border: 1px solid #007bff;
  background: #007bff;
  color: white;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: background-color 0.2s;
}

.export-btn:hover, .import-btn:hover {
  background: #0056b3;
}

.annotation-count {
  color: #28a745;
  font-weight: 600;
}

/* 调试模式样式 */
.debug-modal {
  max-width: 800px;
  max-height: 90vh;
}

.debug-section {
  margin-bottom: 1.5rem;
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 6px;
  border: 1px solid #dee2e6;
}

.debug-section h4 {
  margin: 0 0 1rem 0;
  color: #495057;
  font-size: 1rem;
  border-bottom: 2px solid #007bff;
  padding-bottom: 0.5rem;
}

.debug-info {
  font-family: 'Courier New', monospace;
  font-size: 0.9rem;
}

.debug-info p {
  margin: 0.5rem 0;
  padding: 0.25rem 0;
}

.debug-json {
  max-height: 300px;
  overflow-y: auto;
  background: #2d3748;
  color: #e2e8f0;
  padding: 1rem;
  border-radius: 4px;
  font-family: 'Courier New', monospace;
  font-size: 0.8rem;
  line-height: 1.4;
}

.danger-btn {
  background: #dc3545;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: background-color 0.2s;
}

.danger-btn:hover {
  background: #c82333;
}

.refresh-btn {
  background: #6c757d;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: background-color 0.2s;
}

.refresh-btn:hover {
  background: #5a6268;
}

.rerender-btn {
  background: #28a745;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: background-color 0.2s;
}

.rerender-btn:hover {
  background: #218838;
}

.reset-btn {
  background: #6f42c1;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: background-color 0.2s;
}

.reset-btn:hover {
  background: #5a32a3;
}

/* 样式控制相关样式 */
.style-controls {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.style-toggle {
  background: #6c757d;
  color: white;
  border: none;
  padding: 0.4rem 0.8rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.2s;
}

.style-toggle:hover {
  background: #5a6268;
}

.style-toggle.active {
  background: #17a2b8;
}

.style-toggle.active:hover {
  background: #138496;
}

/* 样式控制面板 */
.style-panel {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: white;
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.3);
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  z-index: 10002;
  animation: stylePanelSlideIn 0.3s ease;
}

@keyframes stylePanelSlideIn {
  from { 
    opacity: 0; 
    transform: translate(-50%, -50%) scale(0.9);
  }
  to { 
    opacity: 1; 
    transform: translate(-50%, -50%) scale(1);
  }
}

.style-panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid #eee;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 12px 12px 0 0;
}

.style-panel-header h3 {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 600;
}

.style-panel-body {
  flex: 1;
  padding: 1.5rem;
  overflow-y: auto;
  max-height: calc(90vh - 200px);
}

.style-section {
  margin-bottom: 2rem;
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 8px;
  border-left: 4px solid #667eea;
}

.style-section h4 {
  margin: 0 0 1rem 0;
  color: #333;
  font-size: 1rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.style-section h4::before {
  content: '';
  width: 8px;
  height: 8px;
  background: #667eea;
  border-radius: 50%;
}

.style-item {
  display: flex;
  align-items: center;
  margin-bottom: 1rem;
  gap: 1rem;
}

.style-item:last-child {
  margin-bottom: 0;
}

.style-item label {
  min-width: 100px;
  font-weight: 500;
  color: #555;
  font-size: 0.9rem;
}

.style-item select,
.style-item input.text-input {
  flex: 1;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.9rem;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.style-item select:focus,
.style-item input.text-input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.input-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
}

.range-input {
  flex: 1;
  min-width: 100px;
}

.text-input {
  width: 80px;
  min-width: 80px;
}

.color-input-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
}

.color-input {
  width: 50px;
  height: 36px;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  padding: 2px;
  transition: border-color 0.2s;
}

.color-input:hover {
  border-color: #667eea;
}

.button-group {
  display: flex;
  gap: 0.25rem;
  flex: 1;
}

.align-btn {
  flex: 1;
  padding: 0.5rem;
  border: 1px solid #ddd;
  background: white;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 1rem;
  border-radius: 4px;
}

.align-btn:hover {
  background: #f0f0f0;
  border-color: #667eea;
}

.align-btn.active {
  background: #667eea;
  color: white;
  border-color: #667eea;
}

.style-panel-footer {
  display: flex;
  justify-content: space-between;
  padding: 1rem 1.5rem;
  border-top: 1px solid #eee;
  background: #f8f9fa;
  border-radius: 0 0 12px 12px;
  gap: 0.5rem;
}

.style-panel-footer button {
  padding: 0.5rem 1rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.2s;
  white-space: nowrap;
}

.reset-btn {
  background: #6c757d;
  color: white;
  border-color: #6c757d;
}

.reset-btn:hover {
  background: #5a6268;
}

.export-btn {
  background: #28a745;
  color: white;
  border-color: #28a745;
}

.export-btn:hover {
  background: #218838;
}

.import-btn {
  background: #17a2b8;
  color: white;
  border-color: #17a2b8;
}

.import-btn:hover {
  background: #138496;
}

/* 移动端适配 */
@media (max-width: 768px) {
  .viewer-header {
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .chapter-select {
    width: 100%;
  }
  
  .content-container {
    padding: 1rem;
  }
  
  .annotation-controls {
    width: 100%;
    justify-content: center;
    flex-wrap: wrap;
    gap: 0.25rem;
  }
  
  .annotation-modal-content {
    width: 95%;
    max-height: 90vh;
  }
  
  .debug-modal {
    width: 98%;
    max-height: 95vh;
  }
  
  .annotation-item {
    padding: 0.8rem;
  }
  
  .annotation-actions {
    flex-direction: column;
  }
  
  .action-btn {
    width: 100%;
  }
  
  .underline-menu {
    min-width: 100px;
  }
  
  .underline-option {
    padding: 6px 8px;
  }
  
  .underline-option svg {
    width: 30px;
    height: 8px;
  }
  
  /* 样式面板移动端适配 */
  .style-panel {
    width: 95%;
    max-height: 95vh;
  }
  
  .style-panel-header {
    padding: 1rem;
  }
  
  .style-panel-body {
    padding: 1rem;
    max-height: calc(95vh - 180px);
  }
  
  .style-section {
    padding: 0.8rem;
    margin-bottom: 1rem;
  }
  
  .style-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
  
  .style-item label {
    min-width: auto;
    font-size: 0.85rem;
  }
  
  .style-item select,
  .style-item input.text-input {
    width: 100%;
  }
  
  .input-group {
    flex-direction: column;
    align-items: stretch;
    gap: 0.5rem;
  }
  
  .range-input {
    width: 100%;
  }
  
  .text-input {
    width: 100%;
    min-width: auto;
  }
  
  .color-input-group {
    flex-direction: row;
    justify-content: space-between;
  }
  
  .button-group {
    flex-wrap: wrap;
    gap: 0.25rem;
  }
  
  .align-btn {
    font-size: 0.9rem;
    padding: 0.4rem;
  }
  
  .style-panel-footer {
    flex-direction: column;
    gap: 0.5rem;
    padding: 1rem;
  }
  
  .style-panel-footer button {
    width: 100%;
  }
}
</style>