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