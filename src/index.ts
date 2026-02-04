export { EpubReader } from './EpubReader';
export { SVGMarkManager } from './SVGMarkManager';
export { SimpleCFIProvider } from './SimpleCFIProvider';
export * from './types';

import { EpubReader } from './EpubReader';
import { EpubReaderOptions } from './types';

// Convenience function for quick loading
export async function loadEpub(
  epubData: ArrayBuffer | Uint8Array | Blob,
  options?: EpubReaderOptions
) {
  const reader = new EpubReader(options);
  await reader.load(epubData);
  return reader;
}