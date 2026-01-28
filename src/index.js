import EPUBReader from './core/EPUBParser';
import EPUBViewer from './core/EPUBViewer';
import StyleController from './core/StyleController';

export default EPUBReader;
export { EPUBReader, EPUBViewer, StyleController };

// 同时导出所有模型类
export { default as EPUBBook } from './models/EPUBBook';
export { default as Chapter } from './models/Chapter';
export { default as TOCItem } from './models/TOCItem';
export { default as Metadata } from './models/Metadata';