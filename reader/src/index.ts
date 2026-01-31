export { EpubReader } from './epub-reader';
export { 
  EpubBook, 
  EpubMetadata, 
  TocItem, 
  Chapter, 
  EpubReaderOptions,
  ReadingSettings,
  ReadingState,
  FontSizeAction,
  ThemeType
} from './types';

// Also export as default for UMD compatibility
export { EpubReader as default } from './epub-reader';