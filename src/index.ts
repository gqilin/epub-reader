// 导出所有类型
export * from './types/index';

// 导出模型类
export { default as EPUBBook } from './models/EPUBBook';
export { default as Chapter } from './models/Chapter';
export { default as TOCItem } from './models/TOCItem';
export { default as Metadata } from './models/Metadata';

// 导出核心类
// @ts-ignore
export { default as EPUBReader } from './core/EPUBParser';
// @ts-ignore
export { default as EPUBViewer } from './core/EPUBViewer';
// @ts-ignore
export { default as StyleController } from './core/StyleController';
// @ts-ignore
export { default as PaginationManager } from './core/PaginationManager';

// 导出Book ID系统
export * from './core/BookIDManager';

// 默认导出主解析器
// @ts-ignore
import EPUBReader from './core/EPUBParser';
export default EPUBReader;