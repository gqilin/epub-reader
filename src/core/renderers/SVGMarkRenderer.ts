import { BaseHighlightRenderer, HighlightElement, HighlightRenderConfig, HighlightRenderingStrategy } from './BaseHighlightRenderer.js';
import { HighlightStyle } from '../../types/Annotation.js';

/**
 * SVG标记高亮渲染器
 * 使用SVG元素覆盖在文本上方实现高亮效果
 */
export class SVGMarkRenderer extends BaseHighlightRenderer {
  private svgOverlay!: SVGElement;
  private svgNamespace: string = 'http://www.w3.org/2000/svg';
  private defsElement!: SVGDefsElement;
  private markerCache: Map<string, SVGElement> = new Map();

  constructor(container: Element, config: HighlightRenderConfig = { strategy: HighlightRenderingStrategy.SVG_OVERLAY }) {
    super(container, config);
    this.initializeSVGOverlay();
  }

  /**
   * 创建高亮
   */
  createHighlight(range: Range, style: HighlightStyle): HighlightElement {
    if (!this.validateRange(range)) {
      throw new Error('Invalid range for highlight creation');
    }

    const highlightId = this.generateHighlightId();
    const text = this.getHighlightText(range);
    
    // 创建SVG高亮元素
    const svgElement = this.createSVGHighlight(range, style, highlightId);
    
    const highlight: HighlightElement = {
      id: highlightId,
      text,
      className: style.className || `highlight-svg-${highlightId}`,
      style,
      range,
      renderData: {
        svg: svgElement
      },
      visible: true
    };

    this.highlights.set(highlightId, highlight);
    this.visibleHighlights.add(highlightId);
    
    return highlight;
  }

  /**
   * 更新高亮
   */
  updateHighlight(highlight: HighlightElement, style: HighlightStyle): void {
    const existingSVG = highlight.renderData?.svg;
    if (existingSVG) {
      existingSVG.remove();
    }

    const newSVGElement = this.createSVGHighlight(highlight.range, style, highlight.id);
    highlight.style = style;
    highlight.renderData = { svg: newSVGElement };
    
    if (highlight.visible) {
      this.svgOverlay.appendChild(newSVGElement);
    }
  }

  /**
   * 删除高亮
   */
  removeHighlight(highlight: HighlightElement): void {
    const svgElement = highlight.renderData?.svg;
    if (svgElement) {
      svgElement.remove();
    }
    
    this.highlights.delete(highlight.id);
    this.visibleHighlights.delete(highlight.id);
  }

  /**
   * 显示高亮
   */
  showHighlight(highlight: HighlightElement): void {
    const svgElement = highlight.renderData?.svg;
    if (svgElement && !this.svgOverlay.contains(svgElement)) {
      this.svgOverlay.appendChild(svgElement);
    }
    highlight.visible = true;
    this.visibleHighlights.add(highlight.id);
  }

  /**
   * 隐藏高亮
   */
  hideHighlight(highlight: HighlightElement): void {
    const svgElement = highlight.renderData?.svg;
    if (svgElement) {
      svgElement.remove();
    }
    highlight.visible = false;
    this.visibleHighlights.delete(highlight.id);
  }

  /**
   * 清除所有高亮
   */
  clearAll(): void {
    // 清除所有SVG高亮元素
    const svgElements = this.svgOverlay.querySelectorAll('[data-highlight-id]');
    svgElements.forEach(element => element.remove());
    
    this.highlights.clear();
    this.visibleHighlights.clear();
  }

  /**
   * 销毁渲染器
   */
  destroy(): void {
    this.clearAll();
    this.svgOverlay.remove();
    this.markerCache.clear();
  }

  // 私有方法

  /**
   * 初始化SVG覆盖层
   */
  private initializeSVGOverlay(): void {
    // 创建SVG覆盖层
    this.svgOverlay = document.createElementNS(this.svgNamespace, 'svg') as SVGElement;
    this.svgOverlay.setAttribute('class', 'svg-highlight-overlay');
    (this.svgOverlay as any).style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 10;
    `;

    // 创建定义元素用于标记和渐变
    this.defsElement = document.createElementNS(this.svgNamespace, 'defs') as SVGDefsElement;
    this.svgOverlay.appendChild(this.defsElement);

    // 添加到容器
    if (this.container instanceof HTMLElement) {
      this.container.style.position = this.container.style.position || 'relative';
      this.container.appendChild(this.svgOverlay);
    }
  }

  /**
   * 创建SVG高亮元素
   */
  private createSVGHighlight(range: Range, style: HighlightStyle, highlightId: string): SVGElement {
    const rects = this.getRangeRects(range);
    const group = document.createElementNS(this.svgNamespace, 'g') as SVGElement;
    group.setAttribute('data-highlight-id', highlightId);

    rects.forEach((rect, index) => {
      const svgElement = this.createSVGElement(rect, style, `${highlightId}-${index}`);
      group.appendChild(svgElement);
    });

    return group;
  }

  /**
   * 创建单个SVG元素
   */
  private createSVGElement(rect: DOMRect, style: HighlightStyle, elementId: string): SVGElement {
    let svgElement: SVGElement;

    // 根据样式类型选择SVG元素
    if (style.border && style.border.includes('dashed')) {
      svgElement = this.createDashedRect(rect, style, elementId);
    } else if (style.borderBottom && style.borderBottom.includes('wavy')) {
      svgElement = this.createWavyLine(rect, style, elementId);
    } else if (style.textDecoration && style.textDecoration.includes('line-through')) {
      svgElement = this.createStrikethroughLine(rect, style, elementId);
    } else if (style.background && style.background.includes('gradient')) {
      svgElement = this.createGradientRect(rect, style, elementId);
    } else {
      svgElement = this.createBasicRect(rect, style, elementId);
    }

    return svgElement;
  }

  /**
   * 创建基础矩形高亮
   */
  private createBasicRect(rect: DOMRect, style: HighlightStyle, elementId: string): SVGRectElement {
    const rectElement = document.createElementNS(this.svgNamespace, 'rect') as SVGRectElement;
    
    rectElement.setAttribute('x', rect.left.toString());
    rectElement.setAttribute('y', rect.top.toString());
    rectElement.setAttribute('width', rect.width.toString());
    rectElement.setAttribute('height', rect.height.toString());
    rectElement.setAttribute('rx', (style.borderRadius || '2px').replace(/px/g, ''));
    rectElement.setAttribute('data-element-id', elementId);

    // 应用样式
    this.applyRectStyles(rectElement, style);
    
    return rectElement;
  }

  /**
   * 创建虚线矩形高亮
   */
  private createDashedRect(rect: DOMRect, style: HighlightStyle, elementId: string): SVGRectElement {
    const rectElement = this.createBasicRect(rect, style, elementId);
    
    // 设置虚线样式
    rectElement.setAttribute('fill', 'none');
    rectElement.setAttribute('stroke', this.extractColor(style.border) || style.color || '#000');
    rectElement.setAttribute('stroke-width', '2');
    rectElement.setAttribute('stroke-dasharray', '5,3');
    
    return rectElement;
  }

  /**
   * 创建波浪线高亮
   */
  private createWavyLine(rect: DOMRect, style: HighlightStyle, elementId: string): SVGPathElement {
    const pathElement = document.createElementNS(this.svgNamespace, 'path') as SVGPathElement;
    
    // 创建波浪线路径
    const waveHeight = 3;
    const waveLength = 8;
    const startX = rect.left;
    const startY = rect.bottom - waveHeight;
    const endX = rect.right;
    
    let pathData = `M ${startX} ${startY}`;
    for (let x = startX; x <= endX; x += waveLength) {
      const nextX = Math.min(x + waveLength / 2, endX);
      const nextY = startY + waveHeight;
      pathData += ` Q ${x + waveLength / 4} ${nextY} ${nextX} ${startY}`;
    }
    
    pathElement.setAttribute('d', pathData);
    pathElement.setAttribute('fill', 'none');
    pathElement.setAttribute('stroke', style.color || '#d32f2f');
    pathElement.setAttribute('stroke-width', '2');
    pathElement.setAttribute('data-element-id', elementId);
    
    return pathElement;
  }

  /**
   * 创建删除线高亮
   */
  private createStrikethroughLine(rect: DOMRect, style: HighlightStyle, elementId: string): SVGLineElement {
    const lineElement = document.createElementNS(this.svgNamespace, 'line') as SVGLineElement;
    
    lineElement.setAttribute('x1', rect.left.toString());
    lineElement.setAttribute('y1', (rect.top + rect.height / 2).toString());
    lineElement.setAttribute('x2', rect.right.toString());
    lineElement.setAttribute('y2', (rect.top + rect.height / 2).toString());
    lineElement.setAttribute('stroke', style.color || '#9e9e9e');
    lineElement.setAttribute('stroke-width', '2');
    lineElement.setAttribute('data-element-id', elementId);
    
    return lineElement;
  }

  /**
   * 创建渐变矩形高亮
   */
  private createGradientRect(rect: DOMRect, style: HighlightStyle, elementId: string): SVGRectElement {
    const rectElement = document.createElementNS(this.svgNamespace, 'rect') as SVGRectElement;
    
    rectElement.setAttribute('x', rect.left.toString());
    rectElement.setAttribute('y', rect.top.toString());
    rectElement.setAttribute('width', rect.width.toString());
    rectElement.setAttribute('height', rect.height.toString());
    rectElement.setAttribute('rx', (style.borderRadius || '4px').replace(/px/g, ''));
    rectElement.setAttribute('data-element-id', elementId);

    // 创建渐变
    const gradientId = `gradient-${elementId}`;
    const gradient = this.createGradient(style.background || '', gradientId);
    this.defsElement.appendChild(gradient);
    
    rectElement.setAttribute('fill', `url(#${gradientId})`);
    rectElement.setAttribute('opacity', (style.opacity || 0.8).toString());
    
    return rectElement;
  }

  /**
   * 创建渐变定义
   */
  private createGradient(gradientString: string, gradientId: string): SVGLinearGradientElement {
    const gradient = document.createElementNS(this.svgNamespace, 'linearGradient') as SVGLinearGradientElement;
    gradient.setAttribute('id', gradientId);
    gradient.setAttribute('x1', '0%');
    gradient.setAttribute('y1', '0%');
    gradient.setAttribute('x2', '100%');
    gradient.setAttribute('y2', '100%');

    // 解析渐变字符串
    const colors = this.parseGradient(gradientString);
    colors.forEach((color, index) => {
      const stop = document.createElementNS(this.svgNamespace, 'stop');
      stop.setAttribute('offset', `${(index / (colors.length - 1)) * 100}%`);
      stop.setAttribute('stop-color', color);
      gradient.appendChild(stop);
    });

    return gradient;
  }

  /**
   * 解析渐变字符串
   */
  private parseGradient(gradientString: string): string[] {
    // 简单解析linear-gradient中的颜色
    const colorMatch = gradientString.match(/#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3}|rgb\([^)]+\)|[a-zA-Z]+/g);
    return colorMatch || ['#ff9a56', '#ff6b6b'];
  }

  /**
   * 应用矩形样式
   */
  private applyRectStyles(rectElement: SVGRectElement, style: HighlightStyle): void {
    if (style.backgroundColor && !style.background?.includes('gradient')) {
      rectElement.setAttribute('fill', style.backgroundColor);
    }
    
    if (style.border && !style.border.includes('dashed')) {
      rectElement.setAttribute('stroke', this.extractColor(style.border) || '#000');
      rectElement.setAttribute('stroke-width', '1');
    }
    
    if (style.opacity) {
      rectElement.setAttribute('opacity', style.opacity.toString());
    }
  }

  /**
   * 提取边框颜色
   */
  private extractColor(borderString: string | undefined): string | null {
    if (!borderString) return null;
    const colorMatch = borderString.match(/#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3}|rgb\([^)]+\)|[a-zA-Z]+/);
    return colorMatch ? colorMatch[0] : null;
  }

  /**
   * 获取范围的矩形区域
   */
  private getRangeRects(range: Range): DOMRect[] {
    const rects = range.getClientRects();
    const containerRect = this.container.getBoundingClientRect();
    
    return Array.from(rects).map(rect => {
      // 转换为相对于容器的坐标
      return new DOMRect(
        rect.left - containerRect.left,
        rect.top - containerRect.top,
        rect.width,
        rect.height
      );
    }).filter(rect => rect.width > 0 && rect.height > 0);
  }
}