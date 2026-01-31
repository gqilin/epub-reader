export interface EpubMetadata {
  title?: string;
  author?: string;
  publisher?: string;
  language?: string;
  identifier?: string;
  description?: string;
}

export interface TocItem {
  id: string;
  title: string;
  href: string;
  children?: TocItem[];
}

export interface Chapter {
  id: string;
  title: string;
  href: string;
  content: string;
}

export class EpubBook {
  metadata: EpubMetadata = {};
  toc: TocItem[] = [];
  chapters: Chapter[] = [];
  manifest: Map<string, string> = new Map();
  spine: string[] = [];
  opfPath?: string;
}

export interface EpubReaderOptions {
  encoding?: string;
}

export interface ReadingSettings {
  fontSize: number;
  minFontSize: number;
  maxFontSize: number;
  isDarkTheme: boolean;
  fontFamily: string;
  lineHeight: number;
}

export interface ReadingState {
  currentChapterIndex: number;
  book: EpubBook | null;
  settings: ReadingSettings;
  contentElement: HTMLElement | null;
}

export type FontSizeAction = 'increase' | 'decrease' | 'reset' | 'custom';

export type ThemeType = 'light' | 'dark';