export interface EpubMetadata {
  title?: string;
  creator?: string;
  description?: string;
  language?: string;
  publisher?: string;
  identifier?: string;
  date?: string;
  rights?: string;
  cover?: string;
}

export interface EpubChapter {
  id: string;
  href: string;
  title?: string;
  order: number;
}

export interface EpubManifest {
  id: string;
  href: string;
  mediaType: string;
}

export interface EpubSpine {
  idref: string;
  linear?: string;
}

export interface EpubTableOfContents {
  id: string;
  href: string;
  title: string;
  children?: EpubTableOfContents[];
  order: number;
}

export interface EpubInfo {
  metadata: EpubMetadata;
  manifest: EpubManifest[];
  spine: EpubSpine[];
  toc: EpubTableOfContents[];
  chapters: EpubChapter[];
}

export interface EpubReaderOptions {
  encoding?: string;
  loadCover?: boolean;
  targetElementId?: string;
  toolbarElementId?: string; // 工具栏DOM元素ID
}

// 标记相关类型定义
export interface AnnotationStyle {
  backgroundColor?: string;
  color?: string;
  textDecoration?: 'none' | 'underline' | 'overline' | 'line-through';
  borderStyle?: 'solid' | 'dashed' | 'dotted' | 'double' | 'wavy';
  borderWidth?: number;
  borderColor?: string;
  borderRadius?: number;
  padding?: number;
  margin?: number;
  fontWeight?: 'normal' | 'bold';
  fontStyle?: 'normal' | 'italic';
  opacity?: number;
}

export interface Annotation {
  id: string;
  cfi: string;
  text: string;
  selectedText: string;
  color: string;
  note?: string;
  created: Date;
  updated: Date;
  style: AnnotationStyle;
  chapterHref?: string;
  chapterTitle?: string;
  pageNumber?: number;
}

export interface AnnotationManager {
  annotations: Map<string, Annotation>;
  
  // 标记管理
  addAnnotation(annotation: Annotation): void;
  removeAnnotation(id: string): void;
  updateAnnotation(id: string, updates: Partial<Annotation>): void;
  getAnnotation(id: string): Annotation | null;
  getAllAnnotations(): Annotation[];
  getAnnotationsByChapter(chapterHref: string): Annotation[];
  
  // 渲染管理
  renderAnnotations(): void;
  clearAnnotations(): void;
  renderAnnotation(annotation: Annotation): HTMLElement;
  
  // 选区管理
  getSelectedTextInfo(): SelectedTextInfo | null;
  createAnnotationFromSelection(color?: string): Annotation | null;
}

export interface SelectedTextInfo {
  text: string;
  cfi: string;
  range: Range;
  chapterHref?: string;
  chapterTitle?: string;
  startOffset: number;
  endOffset: number;
}

export interface AnnotationEvent {
  type: 'create' | 'update' | 'delete' | 'select';
  annotation?: Annotation;
  selectedText?: SelectedTextInfo;
  timestamp: Date;
}

export interface AnnotationOptions {
  onError?: (error: Error) => void;
  onAnnotationCreated?: (annotation: Annotation) => void;
  onAnnotationUpdated?: (annotation: Annotation) => void;
  onAnnotationDeleted?: (annotationId: string) => void;
  onSelectionChange?: (selection: SelectedTextInfo | null) => void;
  onToolbarToggle?: (visible: boolean) => void;
}

// 预定义样式
export const DEFAULT_ANNOTATION_STYLES = {
  yellow: {
    backgroundColor: 'rgba(255, 235, 59, 0.3)',
    color: '#000000',
    padding: 2
  },
  green: {
    backgroundColor: 'rgba(40, 167, 69, 0.3)',
    color: '#000000',
    padding: 2
  },
  blue: {
    backgroundColor: 'rgba(0, 123, 255, 0.3)',
    color: '#ffffff',
    padding: 2
  },
  pink: {
    backgroundColor: 'rgba(255, 105, 180, 0.3)',
    color: '#000000',
    padding: 2
  },
  underline: {
    textDecoration: 'underline',
    borderBottom: '2px solid #000000'
  },
  wavy: {
    textDecoration: 'underline',
    borderBottom: '2px wavy #000000'
  },
  highlight: {
    backgroundColor: 'rgba(255, 255, 0, 0.5)',
    padding: 2
  }
} as const;

export type AnnotationStylePreset = keyof typeof DEFAULT_ANNOTATION_STYLES;

// SVG标记管理器相关类型导出
export type { 
  SVGMark, 
  SVGMarkStyle, 
  SelectionInfo, 
  ToolbarConfig, 
  SimpleCFI,
  SVGMarkManager 
} from './SVGMarkManager';

// CFI相关类型定义
export interface CFIPathComponent {
  type: 'element' | 'text' | 'character';
  index: number;
  assertion?: string;
  parameter?: Record<string, string>;
}

export interface CFI {
  path: string;
  chapterHref?: string;
  chapterId?: string;
  components: CFIPathComponent[];
  localPath: string; // 章节内路径
  scheme?: string;
  term?: string;
}

export interface CFIJumpOptions {
  showLoading?: boolean;
  className?: string;
  onError?: (error: Error) => void;
  onSuccess?: () => void;
  scrollBehavior?: ScrollBehavior;
  highlightTarget?: boolean;
  highlightDuration?: number;
}

export interface CFICursorPosition {
  cfi: CFI;
  textBefore: string;
  textAfter: string;
  textNode?: Text;
  offset?: number;
}