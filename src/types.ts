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