import { HighlightStyleManager } from '../HighlightStyleManager.js';
import { SVGMarkRenderer } from '../renderers/SVGMarkRenderer.js';
import { BaseHighlightRenderer, HighlightRenderingStrategy, HighlightRenderConfig } from '../renderers/BaseHighlightRenderer.js';
import { HighlightStyle, AnnotationConfig, HighlightAnnotation } from '../../types/Annotation.js';
import { CFI } from '../../types/CFI.js';

/**
 * 高亮管理器
 * 统一管理高亮创建、渲染和样式
 */
export class HighlightManager {
  private container: Element;
  private styleManager: HighlightStyleManager;
  private renderer: BaseHighlightRenderer;
  private highlights: Map<string, HighlightAnnotation> = new Map();

  constructor(container: Element, config: AnnotationConfig = {}) {
    this.container = container;
    this.styleManager = new HighlightStyleManager(config);
    
    // 默认使用SVG渲染器
    const renderConfig: HighlightRenderConfig = {
      strategy: HighlightRenderingStrategy.SVG_OVERLAY,
      enableVirtualization: true,
      cacheSize: 100,
      renderDelay: 50,
      enableOptimization: true
    };
    
    this.renderer = new SVGMarkRenderer(container, renderConfig);
  }

  /**
   * 创建高亮
   */
  createHighlight(
    range: Range,
    styleNameOrObject: string | HighlightStyle,
    bookId: string,
    chapterId: string
  ): HighlightAnnotation {
    // 获取样式
    const style = typeof styleNameOrObject === 'string' 
      ? this.styleManager.getPreset(styleNameOrObject) || this.styleManager.getCustomStyle(styleNameOrObject)
      : styleNameOrObject;

    if (!style) {
      throw new Error(`Style not found: ${styleNameOrObject}`);
    }

    // 创建高亮元素
    const highlightElement = this.renderer.createHighlight(range, style);
    
    // 创建高亮注释对象
    const annotation: HighlightAnnotation = {
      id: this.generateHighlightId(),
      type: 'highlight',
      cfi: this.createMockCFI(), // 临时CFI，实际使用时应该从外部传入
      content: highlightElement.text,
      created: new Date(),
      bookId,
      chapterId,
      color: style.backgroundColor || style.color || '#ffff00',
      style,
      selectedText: highlightElement.text,
      textRange: {
        text: highlightElement.text,
        startOffset: 0,
        endOffset: highlightElement.text.length,
        cfi: this.createMockCFI()
      },
      highlightId: highlightElement.id,
      active: true,
      visible: true
    };

    this.highlights.set(annotation.id, annotation);
    return annotation;
  }

  /**
   * 更新高亮样式
   */
  updateHighlight(highlightId: string, styleNameOrObject: string | HighlightStyle): boolean {
    const annotation = this.highlights.get(highlightId);
    if (!annotation) {
      return false;
    }

    // 获取新样式
    const style = typeof styleNameOrObject === 'string' 
      ? this.styleManager.getPreset(styleNameOrObject) || this.styleManager.getCustomStyle(styleNameOrObject)
      : styleNameOrObject;

    if (!style) {
      return false;
    }

    // 更新注释中的样式
    annotation.style = style;
    annotation.modified = new Date();

    // 更新渲染器中的高亮
    const highlightElement = this.renderer['highlights'].get(highlightId);
    if (highlightElement) {
      this.renderer.updateHighlight(highlightElement, style);
    }

    return true;
  }

  /**
   * 删除高亮
   */
  removeHighlight(highlightId: string): boolean {
    const annotation = this.highlights.get(highlightId);
    if (!annotation) {
      return false;
    }

    // 删除渲染器中的高亮
    const highlightElement = this.renderer['highlights'].get(highlightId);
    if (highlightElement) {
      this.renderer.removeHighlight(highlightElement);
    }

    // 删除注释
    this.highlights.delete(highlightId);
    return true;
  }

  /**
   * 显示/隐藏高亮
   */
  toggleHighlight(highlightId: string): boolean {
    const annotation = this.highlights.get(highlightId);
    if (!annotation) {
      return false;
    }

    const highlightElement = this.renderer['highlights'].get(highlightId);
    if (!highlightElement) {
      return false;
    }

    if (annotation.visible) {
      this.renderer.hideHighlight(highlightElement);
      annotation.visible = false;
    } else {
      this.renderer.showHighlight(highlightElement);
      annotation.visible = true;
    }

    annotation.modified = new Date();
    return true;
  }

  /**
   * 获取所有高亮
   */
  getAllHighlights(): HighlightAnnotation[] {
    return Array.from(this.highlights.values());
  }

  /**
   * 按书籍ID获取高亮
   */
  getHighlightsByBook(bookId: string): HighlightAnnotation[] {
    return this.getAllHighlights().filter(highlight => highlight.bookId === bookId);
  }

  /**
   * 按章节ID获取高亮
   */
  getHighlightsByChapter(chapterId: string): HighlightAnnotation[] {
    return this.getAllHighlights().filter(highlight => highlight.chapterId === chapterId);
  }

  /**
   * 获取高亮样式管理器
   */
  getStyleManager(): HighlightStyleManager {
    return this.styleManager;
  }

  /**
   * 导入高亮数据
   */
  importHighlights(highlights: HighlightAnnotation[]): void {
    highlights.forEach(highlight => {
      if (highlight.highlightId && highlight.textRange) {
        try {
          // 这里需要根据textRange重建Range对象
          // 暂时先添加到高亮集合中，实际Range恢复需要更复杂的逻辑
          this.highlights.set(highlight.id, highlight);
          
          // 如果有样式，重新渲染高亮
          if (highlight.style) {
            // 需要重建Range对象来重新创建高亮
            // 这里先跳过实际渲染
          }
        } catch (error) {
          console.warn(`Failed to import highlight ${highlight.id}:`, error);
        }
      }
    });
  }

  /**
   * 导出高亮数据
   */
  exportHighlights(): HighlightAnnotation[] {
    return this.getAllHighlights().map(highlight => ({
      ...highlight,
      // 清理不需要序列化的字段
      highlightId: undefined,
      active: undefined
    }));
  }

  /**
   * 清除所有高亮
   */
  clearAllHighlights(): void {
    this.renderer.clearAll();
    this.highlights.clear();
  }

  /**
   * 销毁高亮管理器
   */
  destroy(): void {
    this.clearAllHighlights();
    this.renderer.destroy();
  }

  // 私有方法

  /**
   * 生成高亮ID
   */
  private generateHighlightId(): string {
    return `highlight-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 创建临时CFI对象（实际使用时应该从外部传入）
   */
  private createMockCFI(): CFI {
    return {
      chapterId: 'temp',
      path: [{ type: 'element', index: 0 }]
    };
  }

  /**
   * 恢复Range对象（需要DOM上下文）
   */
  private restoreRange(textRange: any, container: Element): Range | null {
    try {
      const range = document.createRange();
      // 这里需要实现更复杂的Range恢复逻辑
      // 暂时返回null
      return null;
    } catch {
      return null;
    }
  }

  /**
   * 获取高亮统计信息
   */
  getStats(): {
    total: number;
    byBook: Record<string, number>;
    byChapter: Record<string, number>;
    byStyle: Record<string, number>;
  } {
    const highlights = this.getAllHighlights();
    
    const stats = {
      total: highlights.length,
      byBook: {} as Record<string, number>,
      byChapter: {} as Record<string, number>,
      byStyle: {} as Record<string, number>
    };

    highlights.forEach(highlight => {
      // 按书籍统计
      stats.byBook[highlight.bookId] = (stats.byBook[highlight.bookId] || 0) + 1;
      
      // 按章节统计
      stats.byChapter[highlight.chapterId] = (stats.byChapter[highlight.chapterId] || 0) + 1;
      
      // 按样式统计
      const styleName = highlight.style.className || 'default';
      stats.byStyle[styleName] = (stats.byStyle[styleName] || 0) + 1;
    });

    return stats;
  }

  /**
   * 搜索高亮内容
   */
  searchHighlights(query: string): HighlightAnnotation[] {
    const lowerQuery = query.toLowerCase();
    return this.getAllHighlights().filter(highlight => 
      highlight.content.toLowerCase().includes(lowerQuery) ||
      highlight.selectedText.toLowerCase().includes(lowerQuery) ||
      (highlight.tags && highlight.tags.some(tag => tag.toLowerCase().includes(lowerQuery)))
    );
  }

  /**
   * 批量操作
   */
  showAllHighlights(): void {
    this.getAllHighlights().forEach(highlight => {
      const highlightElement = this.renderer['highlights'].get(highlight.highlightId || '');
      if (highlightElement && !highlight.visible) {
        this.renderer.showHighlight(highlightElement);
        highlight.visible = true;
      }
    });
  }

  hideAllHighlights(): void {
    this.getAllHighlights().forEach(highlight => {
      const highlightElement = this.renderer['highlights'].get(highlight.highlightId || '');
      if (highlightElement && highlight.visible) {
        this.renderer.hideHighlight(highlightElement);
        highlight.visible = false;
      }
    });
  }
}