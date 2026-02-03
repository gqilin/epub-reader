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