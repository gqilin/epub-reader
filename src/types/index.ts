/**
 * EPUB元数据接口
 */
export interface EPUBMetadata {
  title: string;
  creator: string;
  language: string;
  identifier: string;
  date: string;
  publisher: string;
  description: string;
  subject: string;
  rights: string;
  cover: string | null;
  custom: Record<string, any>;
}

/**
 * 章节数据接口
 */
export interface ChapterData {
  id: string;
  href: string;
  title: string;
  order: number;
  content: string;
  mediaType: string;
  size: number;
  isLoaded: boolean;
}

/**
 * 目录项接口
 */
export interface TOCItemData {
  id: string;
  title: string;
  href: string;
  order: number;
  level: number;
  children: TOCItemData[];
  parent: TOCItemData | null;
}

/**
 * 书籍数据接口
 */
export interface BookData {
  metadata: EPUBMetadata;
  chapters: ChapterData[];
  toc: TOCItemData | null;
  manifest: Record<string, ManifestItem>;
  spine: SpineItem[];
  version: string;
  rootPath: string;
}

/**
 * Manifest项接口
 */
export interface ManifestItem {
  id: string;
  href: string;
  mediaType: string;
  properties?: string;
  mediaOverlay?: string | null;
  fallback?: string | null;
}

/**
 * Spine项接口
 */
export interface SpineItem {
  idref: string;
  linear: boolean;
  properties: string;
  order: number;
}

/**
 * 搜索选项接口
 */
export interface SearchOptions {
  caseSensitive?: boolean;
  wholeWord?: boolean;
  regex?: boolean;
}

/**
 * 搜索结果接口
 */
export interface SearchResult {
  chapter: ChapterData;
  matches: SearchMatch[];
}

/**
 * 搜索匹配接口
 */
export interface SearchMatch {
  text: string;
  index: number;
  context: string;
}

/**
 * 容器数据接口
 */
export interface ContainerData {
  fullPath: string;
  mediaType: string;
  version: string | null;
}

/**
 * OPF数据接口
 */
export interface OPFData {
  version: string;
  uniqueIdentifier: string;
  metadata: Record<string, any>;
  manifest: Record<string, ManifestItem>;
  spine: {
    items: SpineItem[];
    toc: string;
    pageProgressionDirection?: string;
  };
  guide?: GuideItem[];
}

/**
 * Guide项接口
 */
export interface GuideItem {
  type: string;
  title: string;
  href: string;
}

/**
 * NCX数据接口
 */
export interface NCXData {
  version: string;
  head: Record<string, string>;
  docTitle: string;
  docAuthor: string;
  navMap: TOCItemData;
  pageList?: PageListItem[];
  navList?: NavListItem[];
}

/**
 * PageList项接口
 */
export interface PageListItem {
  type: string;
  value: string;
  label: string;
  href: string;
}

/**
 * NavList项接口
 */
export interface NavListItem {
  id: string;
  value: string;
  label: string;
  href: string;
}

/**
 * 导航数据接口
 */
export interface NavigationData {
  toc?: TOCItemData;
  pageList?: PageListItem[];
  landmarks?: LandmarkItem[];
}

/**
 * Landmark项接口
 */
export interface LandmarkItem {
  href: string;
  title: string;
  type: string;
}

/**
 * 阅读器设置接口
 */
export interface ViewerSettings {
  fontSize?: string;
  fontFamily?: string;
  fontColor?: string;
  backgroundColor?: string;
  lineHeight?: string;
  letterSpacing?: string;
  paragraphSpacing?: string;
  textAlign?: string;
  maxWidth?: string;
  padding?: string;
}

/**
 * 阅读器选项接口
 */
export interface ViewerOptions extends ViewerSettings {
  container?: HTMLElement | null;
  contentArea?: HTMLElement | null;
  tocArea?: HTMLElement | null;
  metadataArea?: HTMLElement | null;
  onChapterChange?: (chapter: ChapterData) => void;
  onLoad?: (book: BookData) => void;
  onError?: (error: Error) => void;
}

/**
 * 主题接口
 */
export interface Theme {
  name: string;
  backgroundColor: string;
  fontColor: string;
  fontSize?: string;
  fontFamily?: string;
  lineHeight?: string;
  letterSpacing?: string;
}

/**
 * 字体预设接口
 */
export interface FontPreset {
  name: string;
  fontFamily: string;
}

/**
 * 字号预设接口
 */
export interface FontSizePreset {
  name: string;
  size: string;
}

/**
 * 行高预设接口
 */
export interface LineHeightPreset {
  name: string;
  height: string;
}

/**
 * 段间距预设接口
 */
export interface ParagraphSpacingPreset {
  name: string;
  spacing: string;
}

/**
 * 样式控制面板选项接口
 */
export interface ControlPanelOptions {
  container?: HTMLElement;
  showTheme?: boolean;
  showFont?: boolean;
  showFontSize?: boolean;
  showLineHeight?: boolean;
  showColors?: boolean;
}

/**
 * 导出的设置接口
 */
export interface ExportedSettings {
  theme: string;
  settings: ViewerSettings;
  customStyles: Record<string, ViewerSettings>;
}