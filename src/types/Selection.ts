/**
 * 文本选择相关类型定义
 */

import { CFI } from './CFI.js';

/**
 * 基础文本选择
 */
export interface TextSelection {
  /** 开始位置CFI */
  startCFI: CFI;
  /** 结束位置CFI */
  endCFI: CFI;
  /** 选中文本 */
  selectedText: string;
  /** 所在章节ID */
  chapterId: string;
  /** 前后文 */
  contextBefore: string;
  contextAfter: string;
  /** 选择时间 */
  timestamp: number;
}

/**
 * 增强的文本选择信息
 */
export interface EnhancedSelection extends TextSelection {
  /** 选中词数 */
  wordCount: number;
  /** 选中字符数 */
  charCount: number;
  /** 前一个句子 */
  sentenceBefore: string;
  /** 后一个句子 */
  sentenceAfter: string;
  /** 段落索引 */
  paragraphIndex: number;
  /** 段落内偏移 */
  paragraphOffset: number;
  /** 行号 */
  lineNumber?: number;
  /** 行内偏移 */
  lineOffset?: number;
}

/**
 * 选择范围
 */
export interface SelectionRange {
  /** 开始位置 */
  start: {
    cfi: CFI;
    offset: number;
    textNode?: Text;
    element?: Element;
  };
  /** 结束位置 */
  end: {
    cfi: CFI;
    offset: number;
    textNode?: Text;
    element?: Element;
  };
  /** 是否折叠 */
  isCollapsed: boolean;
  /** 方向 */
  direction: 'ltr' | 'rtl';
}

/**
 * 选择事件
 */
export interface SelectionEvent {
  /** 当前选择 */
  selection: EnhancedSelection | null;
  /** 事件类型 */
  type: 'select' | 'change' | 'clear';
  /** 触发方式 */
  trigger: 'mouse' | 'keyboard' | 'touch' | 'programmatic';
  /** 选择时长 */
  duration?: number;
}

/**
 * 选择配置
 */
export interface SelectionConfig {
  /** 最小选择字符数 */
  minSelectionLength?: number;
  /** 最大选择字符数 */
  maxSelectionLength?: number;
  /** 是否自动检测 */
  autoDetect?: boolean;
  /** 是否监听鼠标事件 */
  listenMouse?: boolean;
  /** 是否监听键盘事件 */
  listenKeyboard?: boolean;
  /** 是否监听触摸事件 */
  listenTouch?: boolean;
  /** 选择防抖时间（毫秒） */
  debounceTime?: number;
}