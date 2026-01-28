# 📍 EPUBReader CFI系统设计方案

## 🎯 功能概述

实现完整的CFI（Canonical Fragment Identifier）系统，支持：
- 📍 精确位置定位和恢复
- 🎯 文本选择和范围识别
- 📝 笔记和高亮功能
- 🔄 位置同步和书签
- 📊 阅读进度追踪

## 🏗️ 系统架构

### 核心模块设计

```
CFI System/
├── types/                   # 类型定义
│   ├── CFI.ts              # CFI相关接口
│   ├── Position.ts         # 位置相关接口
│   ├── Annotation.ts        # 注释相关接口
│   └── Selection.ts         # 选择相关接口
├── core/                    # 核心实现
│   ├── CFIGenerator.ts      # CFI生成器
│   ├── CFIParser.ts         # CFI解析器
│   ├── PositionTracker.ts   # 位置追踪器
│   └── SelectionDetector.ts # 选择检测器
├── features/                # 功能模块
│   ├── HighlightManager.ts  # 高亮管理器
│   ├── NoteManager.ts      # 笔记管理器
│   ├── BookmarkManager.ts   # 书签管理器
│   └── ProgressTracker.ts  # 进度追踪器
├── utils/                   # 工具类
│   ├── DOMUtils.ts         # DOM工具
│   ├── TextUtils.ts        # 文本工具
│   └── MathUtils.ts        # 数学工具
└── storage/                 # 存储层
    ├── LocalStorage.ts      # 本地存储
    ├── IndexedDB.ts        # IndexedDB存储
    └── CloudSync.ts        # 云同步
```

## 📋 CFI数据结构设计

### 1. CFI基础结构

```typescript
// CFI主接口
interface CFI {
  chapterId: string;           // 章节ID
  path: CFIPath[];             // DOM路径
  textOffset?: number;          // 文本偏移
  characterOffset?: number;     // 字符偏移
  hash?: string;               // 内容哈希（用于验证）
}

// CFI路径节点
interface CFIPath {
  type: 'element' | 'text' | 'offset';
  index: number;               // 索引位置
  elementId?: string;          // 元素ID
  elementClass?: string;       // 元素类名
  tagName?: string;           // 标签名
  textContent?: string;        // 文本内容（用于定位）
}

// CFI字符串格式
// epube:/chapter1/6/4!/4:2,/2:6
//        章节ID  路径        文本偏移
```

### 2. 位置系统

```typescript
// 阅读位置
interface ReadingPosition {
  cfi: CFI;                   // CFI位置
  chapterId: string;          // 当前章节
  chapterProgress: number;     // 章节进度(0-1)
  bookProgress: number;        // 全书进度(0-1)
  timestamp: number;           // 创建时间
  viewportOffset?: number;     // 视口偏移
}

// 文本选择范围
interface TextSelection {
  startCFI: CFI;              // 开始位置CFI
  endCFI: CFI;                // 结束位置CFI
  selectedText: string;        // 选中文本
  chapterId: string;          // 所在章节
  contextBefore: string;       // 前后文
  contextAfter: string;
}

// 增强选择信息
interface EnhancedSelection extends TextSelection {
  wordCount: number;           // 选中词数
  charCount: number;           // 选中字符数
  sentenceBefore: string;      // 前一个句子
  sentenceAfter: string;       // 后一个句子
  paragraphIndex: number;      // 段落索引
}
```

### 3. 注释系统

```typescript
// 基础注释接口
interface Annotation {
  id: string;                  // 唯一ID
  type: 'highlight' | 'note' | 'bookmark';
  cfi: CFI;                    // 位置信息
  content: string;              // 注释内容
  created: Date;                // 创建时间
  modified?: Date;              // 修改时间
  bookId: string;               // 书籍ID
  chapterId: string;            // 章节ID
}

// 高亮注释
interface HighlightAnnotation extends Annotation {
  type: 'highlight';
  color: string;                // 高亮颜色
  style: HighlightStyle;        // 高亮样式
  selectedText: string;         // 选中文本
  textRange: TextSelection;     // 文本范围
}

// 笔记注释
interface NoteAnnotation extends Annotation {
  type: 'note';
  title: string;                // 笔记标题
  content: string;               // 笔记内容
  selection?: TextSelection;      // 关联的文本选择
  tags: string[];               // 标签
}

// 书签注释
interface BookmarkAnnotation extends Annotation {
  type: 'bookmark';
  title: string;                // 书签标题
  description?: string;          // 描述
  thumbnail?: string;            // 缩略图
}
```

## 🔧 核心功能模块

### 1. CFI生成器 (CFIGenerator)

```typescript
class CFIGenerator {
  // 从DOM元素生成CFI
  static fromElement(element: Element, chapterId: string): CFI;
  
  // 从文本节点生成CFI
  static fromTextNode(node: Text, offset: number, chapterId: string): CFI;
  
  // 从选择范围生成CFI
  static fromSelection(range: Range, chapterId: string): TextSelection;
  
  // 从滚动位置生成CFI
  static fromScrollPosition(scrollTop: number, chapterId: string): CFI;
  
  // 生成CFI字符串
  static toString(cfi: CFI): string;
  
  // 验证CFI有效性
  static validate(cfi: CFI): boolean;
}
```

### 2. CFI解析器 (CFIParser)

```typescript
class CFIParser {
  // 解析CFI字符串
  static parse(cfiString: string): CFI;
  
  // 查找DOM元素
  static findElement(cfi: CFI, container: Element): Element;
  
  // 查找文本节点和偏移
  static findTextNode(cfi: CFI, container: Element): {node: Text, offset: number};
  
  // 查找选择范围
  static findSelection(cfi: TextSelection, container: Element): Range;
  
  // 恢复滚动位置
  static restoreScrollPosition(cfi: CFI, container: Element): void;
  
  // 验证CFI是否仍然有效
  static validateCFI(cfi: CFI, container: Element): boolean;
}
```

### 3. 位置追踪器 (PositionTracker)

```typescript
class PositionTracker {
  constructor(container: Element);
  
  // 开始追踪位置
  startTracking(): void;
  
  // 停止追踪
  stopTracking(): void;
  
  // 获取当前位置CFI
  getCurrentCFI(): CFI;
  
  // 获取滚动位置
  getScrollPosition(): ReadingPosition;
  
  // 监听位置变化
  onPositionChange(callback: (position: ReadingPosition) => void): void;
  
  // 自动保存位置
  autoSave: boolean;
  
  // 位置变化阈值
  positionThreshold: number;
}
```

### 4. 选择检测器 (SelectionDetector)

```typescript
class SelectionDetector {
  constructor(container: Element);
  
  // 开始监听选择
  startListening(): void;
  
  // 停止监听
  stopListening(): void;
  
  // 获取当前选择
  getCurrentSelection(): EnhancedSelection | null;
  
  // 监听选择变化
  onSelectionChange(callback: (selection: EnhancedSelection) => void): void;
  
  // 清除选择
  clearSelection(): void;
  
  // 选择文本
  selectText(text: string): void;
  
  // 选择CFI范围
  selectCFI(startCFI: CFI, endCFI: CFI): void;
}
```

## 🎨 功能特性模块

### 1. 高亮管理器 (HighlightManager)

```typescript
class HighlightManager {
  constructor(container: Element);
  
  // 创建高亮
  createHighlight(selection: TextSelection, color?: string): HighlightAnnotation;
  
  // 更新高亮样式
  updateHighlight(id: string, style: HighlightStyle): void;
  
  // 删除高亮
  removeHighlight(id: string): void;
  
  // 查找高亮
  findHighlight(cfi: CFI): HighlightAnnotation | null;
  
  // 获取所有高亮
  getAllHighlights(): HighlightAnnotation[];
  
  // 高亮样式预设
  stylePresets: Record<string, HighlightStyle>;
  
  // 高亮点击事件
  onHighlightClick(callback: (highlight: HighlightAnnotation) => void): void;
}
```

### 2. 笔记管理器 (NoteManager)

```typescript
class NoteManager {
  constructor();
  
  // 创建笔记
  createNote(selection: TextSelection, content: string): NoteAnnotation;
  
  // 更新笔记
  updateNote(id: string, content: string, title?: string): void;
  
  // 删除笔记
  deleteNote(id: string): void;
  
  // 搜索笔记
  searchNotes(query: string): NoteAnnotation[];
  
  // 按标签过滤
  filterByTag(tag: string): NoteAnnotation[];
  
  // 获取所有笔记
  getAllNotes(): NoteAnnotation[];
  
  // 导出笔记
  exportNotes(format: 'json' | 'markdown' | 'txt'): string;
  
  // 导入笔记
  importNotes(data: string, format: 'json' | 'markdown' | 'txt'): void;
}
```

### 3. 书签管理器 (BookmarkManager)

```typescript
class BookmarkManager {
  constructor();
  
  // 添加书签
  addBookmark(cfi: CFI, title?: string): BookmarkAnnotation;
  
  // 删除书签
  removeBookmark(id: string): void;
  
  // 更新书签
  updateBookmark(id: string, title?: string, description?: string): void;
  
  // 获取所有书签
  getAllBookmarks(): BookmarkAnnotation[];
  
  // 按章节分组
  getBookmarksByChapter(): Record<string, BookmarkAnnotation[]>;
  
  // 导航到书签
  navigateToBookmark(id: string): void;
}
```

### 4. 进度追踪器 (ProgressTracker)

```typescript
class ProgressTracker {
  constructor();
  
  // 更新阅读进度
  updateProgress(position: ReadingPosition): void;
  
  // 获取当前进度
  getCurrentProgress(): { chapter: number; book: number; };
  
  // 获取章节进度
  getChapterProgress(chapterId: string): number;
  
  // 获取预计阅读时间
  getEstimatedReadingTime(): number;
  
  // 获取阅读统计
  getReadingStats(): {
    totalPages: number;
    pagesRead: number;
    timeSpent: number;
    averageReadingSpeed: number;
  };
  
  // 设置阅读目标
  setReadingGoal(dailyMinutes: number): void;
  
  // 检查目标完成情况
  checkGoalProgress(): GoalProgress;
}
```

## 💾 存储系统设计

### 1. 本地存储

```typescript
class LocalStorageManager {
  // 保存注释
  saveAnnotations(bookId: string, annotations: Annotation[]): void;
  
  // 加载注释
  loadAnnotations(bookId: string): Annotation[];
  
  // 保存阅读位置
  saveReadingPosition(bookId: string, position: ReadingPosition): void;
  
  // 加载阅读位置
  loadReadingPosition(bookId: string): ReadingPosition | null;
  
  // 保存阅读进度
  saveProgress(bookId: string, progress: ProgressData): void;
  
  // 清理过期数据
  cleanup(): void;
}
```

### 2. IndexedDB存储

```typescript
class IndexedDBManager {
  // 初始化数据库
  async init(): Promise<void>;
  
  // 批量操作
  async saveAnnotationsBatch(annotations: Annotation[]): Promise<void>;
  
  // 搜索查询
  async searchAnnotations(query: string): Promise<Annotation[]>;
  
  // 分页查询
  async getAnnotationsPaginated(page: number, limit: number): Promise<Annotation[]>;
  
  // 同步状态
  async getSyncStatus(): Promise<SyncStatus>;
  
  // 云同步
  async syncWithCloud(): Promise<SyncResult>;
}
```

## 🎯 API使用示例

### 1. 基础CFI操作

```typescript
import { CFIManager, PositionTracker, SelectionDetector } from 'epubreader';

// 初始化CFI管理器
const cfiManager = new CFIManager(container);

// 获取当前位置
const currentCFI = cfiManager.getCurrentCFI();
console.log('当前位置:', cfiManager.toString(currentCFI));

// 恢复到指定位置
const savedCFI = CFIGenerator.parse("epube:/chapter1/6/4!/4:2");
cfiManager.navigateToCFI(savedCFI);
```

### 2. 文本选择和注释

```typescript
// 监听文本选择
selectionDetector.onSelectionChange((selection) => {
  console.log('选中文本:', selection.selectedText);
  console.log('CFI范围:', {
    start: cfiManager.toString(selection.startCFI),
    end: cfiManager.toString(selection.endCFI)
  });
  
  // 创建高亮
  const highlight = highlightManager.createHighlight(selection, '#ffeb3b');
  
  // 添加笔记
  const note = noteManager.createNote(selection, '这是一个重要概念');
});
```

### 3. 位置保存和恢复

```typescript
// 自动保存阅读位置
positionTracker.autoSave = true;
positionTracker.startTracking();

// 监听位置变化
positionTracker.onPositionChange((position) => {
  // 保存到本地
  localStorage.setItem('reading-position', JSON.stringify(position));
});

// 恢复阅读位置
const savedPosition = localStorage.getItem('reading-position');
if (savedPosition) {
  const position = JSON.parse(savedPosition);
  cfiManager.navigateToCFI(position.cfi);
}
```

### 4. 笔记和高亮管理

```typescript
// 获取所有高亮
const highlights = highlightManager.getAllHighlights();
console.log(`共 ${highlights.length} 个高亮`);

// 搜索笔记
const notes = noteManager.searchNotes('重要概念');
console.log(`找到 ${notes.length} 个相关笔记`);

// 导出笔记
const exportData = noteManager.exportNotes('markdown');
console.log('导出的笔记:', exportData);
```

## 🚀 实现优先级

### Phase 1: 核心CFI系统 (高优先级)
1. ✅ CFI数据结构和类型定义
2. ⏳ CFIGenerator - CFI生成器
3. ⏳ CFIParser - CFI解析器
4. ⏳ 基础位置追踪

### Phase 2: 选择和位置系统 (高优先级)
1. ⏳ SelectionDetector - 选择检测器
2. ⏳ PositionTracker - 位置追踪器
3. ⏳ DOM工具和文本处理

### Phase 3: 注释功能 (中优先级)
1. ⏳ HighlightManager - 高亮管理器
2. ⏳ NoteManager - 笔记管理器
3. ⏳ BookmarkManager - 书签管理器

### Phase 4: 高级功能 (低优先级)
1. ⏳ ProgressTracker - 进度追踪器
2. ⏳ 存储系统和同步
3. ⏳ 导入导出功能

## 📋 技术挑战和解决方案

### 1. CFI稳定性
- **挑战**: DOM结构变化导致CFI失效
- **解决**: 内容哈希验证、模糊匹配、备用定位策略

### 2. 性能优化
- **挑战**: 大量注释的渲染性能
- **解决**: 虚拟化渲染、延迟加载、批量操作

### 3. 跨平台兼容
- **挑战**: 不同浏览器API差异
- **解决**: 标准化封装、polyfill、特性检测

### 4. 数据同步
- **挑战**: 多设备间数据一致性
- **解决**: 冲突检测、版本控制、增量同步

---

这个设计方案提供了完整的CFI系统架构，支持精确的位置定位、文本交互和注释功能。你觉得这个方案如何？需要我开始实现哪个部分？