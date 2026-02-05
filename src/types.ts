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
}

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

// 标记相关类型定义
export type AnnotationType = 'highlight' | 'underline' | 'note' | 'bookmark';

// 下划线样式类型
export type UnderlineStyle = 
  | 'solid'     // 实线
  | 'dashed'    // 虚线
  | 'dotted'    // 点线
  | 'wavy'      // 波浪线
  | 'double'    // 双线
  | 'thick'     // 粗线
  | 'custom';   // 自定义

// 下划线配置
export interface UnderlineConfig {
  style: UnderlineStyle;
  color?: string;
  thickness?: number; // 线条粗细
  waveAmplitude?: number; // 波浪振幅
  waveFrequency?: number; // 波浪频率
  dashPattern?: string;   // 虚线图案，如 "5,3"
  spacing?: number;        // 双线间距
}

export interface Annotation {
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
  // 下划线专用配置
  underlineConfig?: UnderlineConfig;
}

export interface AnnotationToolbarConfig {
  elementId: string;
  position: 'top' | 'bottom' | 'floating';
  showOnSelection: boolean;
  autoHideDelay?: number;
}

export interface AnnotationManager {
  createAnnotation: (type: AnnotationType, text: string, cfi: CFI, options?: any) => Promise<Annotation>;
  removeAnnotation: (id: string) => Promise<void>;
  updateAnnotation: (id: string, updates: Partial<Annotation>) => Promise<Annotation>;
  getAnnotations: (chapterId?: string) => Annotation[];
  exportAnnotations: () => string;
  importAnnotations: (data: string) => Promise<void>;
  on: (event: 'created' | 'removed' | 'updated', callback: Function) => void;
  off: (event: 'created' | 'removed' | 'updated', callback: Function) => void;
}

export interface AnnotationOptions {
  containerId: string;
  toolbarId: string;
  onAnnotationCreated?: (annotation: Annotation) => void;
  onAnnotationRemoved?: (id: string) => void;
  onAnnotationUpdated?: (annotation: Annotation) => void;
}

// 阅读样式控制相关类型定义
export interface ReadingStyles {
  fontFamily?: string;           // 字体
  fontSize?: string;             // 字号 (如 "16px", "1.2em")
  color?: string;                // 字色 (如 "#333333", "rgb(51, 51, 51)")
  lineHeight?: string;           // 行高 (如 "1.6", "160%")
  paragraphSpacing?: string;     // 段间距 (如 "1em", "16px")
  backgroundColor?: string;      // 背景色 (如 "#ffffff", "rgb(255, 255, 255)")
  maxWidth?: string;             // 最大宽度 (如 "800px", "90%")
  margin?: string;               // 页面边距 (如 "0 auto", "20px")
  padding?: string;              // 内边距 (如 "20px", "2em")
  textAlign?: 'left' | 'center' | 'right' | 'justify'; // 文本对齐
  fontWeight?: 'normal' | 'bold' | '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900'; // 字体粗细
  letterSpacing?: string;         // 字符间距 (如 "0.02em", "1px")
  wordSpacing?: string;          // 词间距 (如 "0.1em", "2px")
  textIndent?: string;           // 首行缩进 (如 "2em", "32px")
}

export interface StyleUpdateCallback {
  (styles: ReadingStyles): void;
}

export interface StyleManager {
  setStyle: (key: keyof ReadingStyles, value: string) => Promise<ReadingStyles>;
  getStyles: () => ReadingStyles;
  setStyles: (styles: Partial<ReadingStyles>) => Promise<ReadingStyles>;
  resetStyles: () => Promise<ReadingStyles>;
  onStyleUpdate: (callback: StyleUpdateCallback) => void;
  offStyleUpdate: (callback: StyleUpdateCallback) => void;
}