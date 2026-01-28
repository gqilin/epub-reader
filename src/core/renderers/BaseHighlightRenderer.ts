import { HighlightStyle } from '../../types/Annotation.js';

/**
 * 高亮渲染策略枚举
 */
export enum HighlightRenderingStrategy {
  /** DOM标签方式（当前实现） */
  DOM_SPAN = 'dom-span',
  
  /** CSS背景方式 */
  CSS_BACKGROUND = 'css-background',
  
  /** Canvas覆盖方式 */
  CANVAS_OVERLAY = 'canvas-overlay',
  
  /** SVG覆盖方式 */
  SVG_OVERLAY = 'svg-overlay',
  
  /** 混合方式 */
  HYBRID = 'hybrid'
}

/**
 * 高亮渲染配置
 */
export interface HighlightRenderConfig {
  /** 渲染策略 */
  strategy: HighlightRenderingStrategy;
  
  /** 是否启用虚拟化 */
  enableVirtualization?: boolean;
  
  /** 高亮缓存大小 */
  cacheSize?: number;
  
  /** 渲染延迟 */
  renderDelay?: number;
  
  /** 是否启用优化 */
  enableOptimization?: boolean;
}

/**
 * 高亮元素信息
 */
export interface HighlightElement {
  /** 高亮ID */
  id: string;
  
  /** DOM元素 */
  element?: HTMLElement;
  
  /** 文本内容 */
  text: string;
  
  /** 样式类 */
  className: string;
  
  /** 样式定义 */
  style: HighlightStyle;
  
  /** 位置信息 */
  range: Range;
  
  /** 渲染数据 */
  renderData?: {
    canvas?: HTMLCanvasElement;
    svg?: SVGElement;
    background?: string;
  };
  
  /** 是否可见 */
  visible: boolean;
  
  /** 缓存键 */
  cacheKey?: string;
}

/**
 * 高亮渲染器基类
 */
export abstract class BaseHighlightRenderer {
  protected container: Element;
  protected config: HighlightRenderConfig;
  protected highlights: Map<string, HighlightElement> = new Map();
  protected visibleHighlights: Set<string> = new Set();

  constructor(container: Element, config: HighlightRenderConfig) {
    this.container = container;
    this.config = config;
  }

  /**
   * 创建高亮
   */
  abstract createHighlight(range: Range, style: HighlightStyle): HighlightElement;

  /**
   * 更新高亮
   */
  abstract updateHighlight(highlight: HighlightElement, style: HighlightStyle): void;

  /**
   * 删除高亮
   */
  abstract removeHighlight(highlight: HighlightElement): void;

  /**
   * 显示/隐藏高亮
   */
  showHighlight(highlight: HighlightElement): void {
    highlight.visible = true;
    this.visibleHighlights.add(highlight.id);
  }

  hideHighlight(highlight: HighlightElement): void {
    highlight.visible = false;
    this.visibleHighlights.delete(highlight.id);
  }

  /**
   * 批量操作
   */
  showHighlights(highlights: HighlightElement[]): void {
    highlights.forEach(highlight => this.showHighlight(highlight));
  }

  hideHighlights(highlights: HighlightElement[]): void {
    highlights.forEach(highlight => this.hideHighlight(highlight));
  }

  /**
   * 清除所有高亮
   */
  clearAll(): void {
    this.highlights.clear();
    this.visibleHighlights.clear();
  }

  /**
   * 销毁渲染器
   */
  destroy(): void {
    this.clearAll();
  }

  // 通用方法
  protected generateHighlightId(): string {
    return `highlight-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  protected getHighlightText(range: Range): string {
    return range.toString();
  }

  protected validateRange(range: Range): boolean {
    try {
      return range.collapsed === false && range.toString().trim().length > 0;
    } catch {
      return false;
    }
  }
}