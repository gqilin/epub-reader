// 导出所有类型
export * from './types/index.js';

// 导出模型类
export { default as EPUBBook } from './models/EPUBBook.js';
export { default as Chapter } from './models/Chapter.js';
export { default as TOCItem } from './models/TOCItem.js';
export { default as Metadata } from './models/Metadata.js';

// 导出核心类
export { default as EPUBReader } from './core/EPUBParser.js';
export { default as EPUBViewer } from './core/EPUBViewer.js';
export { default as StyleController } from './core/StyleController.js';

// 默认导出主解析器
import EPUBReader from './core/EPUBParser.js';
export default EPUBReader;