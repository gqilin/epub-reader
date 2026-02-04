import { Annotation, AnnotationStyle, SelectedTextInfo, AnnotationOptions } from './types';
import { SimpleCFIProvider } from './SimpleCFIProvider';

// SVG标记样式接口
export interface SVGMarkStyle {
  type: 'highlight' | 'underline' | 'dashed' | 'dotted' | 'wavy' | 'double' | 'solid';
  color: string;
  backgroundColor?: string;
  strokeWidth?: number;
  opacity?: number;
  padding?: number;
  radius?: number;
}

// SVG标记接口
export interface SVGMark {
  id: string;
  cfi: string;
  text: string;
  style: SVGMarkStyle;
  element?: SVGElement;
  created: Date;
  updated: Date;
  chapterHref?: string;
  chapterTitle?: string;
}

// 选区信息
export interface SelectionInfo {
  text: string;
  cfi: string;
  range: Range;
  chapterHref?: string;
  chapterTitle?: string;
}

// 工具栏配置
export interface ToolbarConfig {
  elementId: string;
  position: 'top' | 'bottom' | 'floating';
  colors: string[];
  styles: SVGMarkStyle['type'][];
  autoHide: boolean;
  hideDelay: number;
}

// 简化的CFI接口
export interface SimpleCFI {
  path: string;
  chapterHref?: string;
  chapterTitle?: string;
}

// SVG标记管理器
export class SVGMarkManager {
  private svgContainer: SVGSVGElement | null = null;
  private marks: Map<string, SVGMark> = new Map();
  private currentSelection: SelectionInfo | null = null;
  private toolbarElement: HTMLElement | null = null;
  private isToolbarVisible = false;
  private hideTimer: number | null = null;
  
  private targetElementId: string;
  private options: AnnotationOptions;
  private toolbarConfig: ToolbarConfig;
  private cfiProvider: SimpleCFIProvider;

  constructor(
    targetElementId: string,
    options: AnnotationOptions = {},
    toolbarConfig: Partial<ToolbarConfig> = {}
  ) {
    this.targetElementId = targetElementId;
    this.options = options;
    this.cfiProvider = new SimpleCFIProvider();
    
    // 默认工具栏配置
    this.toolbarConfig = {
      elementId: toolbarConfig.elementId || 'epub-toolbar',
      position: toolbarConfig.position || 'floating',
      colors: toolbarConfig.colors || ['#ffeb3b', '#4caf50', '#2196f3', '#e91e63', '#ff9800'],
      styles: toolbarConfig.styles || ['highlight', 'underline', 'dashed', 'wavy'],
      autoHide: toolbarConfig.autoHide !== false,
      hideDelay: toolbarConfig.hideDelay || 3000,
      ...toolbarConfig
    };

    this.init();
  }

  // 初始化SVG容器和事件监听
  private init(): void {
    this.createSVGContainer();
    this.setupEventListeners();
    this.initToolbar();
  }

  // 创建SVG容器
  private createSVGContainer(): void {
    const targetElement = document.getElementById(this.targetElementId);
    if (!targetElement) {
      console.error('Target element not found');
      return;
    }

    // 创建SVG覆盖层
    this.svgContainer = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.svgContainer.style.position = 'absolute';
    this.svgContainer.style.top = '0';
    this.svgContainer.style.left = '0';
    this.svgContainer.style.width = '100%';
    this.svgContainer.style.height = '100%';
    this.svgContainer.style.pointerEvents = 'none';
    this.svgContainer.style.zIndex = '1000';
    
    // 设置目标元素为相对定位
    targetElement.style.position = 'relative';
    targetElement.appendChild(this.svgContainer);
  }

  // 初始化工具栏
  private initToolbar(): void {
    this.toolbarElement = document.getElementById(this.toolbarConfig.elementId);
    if (!this.toolbarElement) {
      console.warn(`Toolbar element with ID "${this.toolbarConfig.elementId}" not found`);
      return;
    }

    // 设置工具栏样式
    this.toolbarElement.style.display = 'none';
    this.toolbarElement.style.position = this.toolbarConfig.position === 'floating' ? 'absolute' : 'relative';
    this.toolbarElement.style.zIndex = '1001';
    this.toolbarElement.style.backgroundColor = '#fff';
    this.toolbarElement.style.border = '1px solid #ccc';
    this.toolbarElement.style.borderRadius = '4px';
    this.toolbarElement.style.padding = '8px';
    this.toolbarElement.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';

    this.populateToolbar();
  }

  // 填充工具栏内容
  private populateToolbar(): void {
    if (!this.toolbarElement) return;

    this.toolbarElement.innerHTML = '';

    // 颜色选择器
    const colorGroup = document.createElement('div');
    colorGroup.style.marginBottom = '8px';
    
    this.toolbarConfig.colors.forEach(color => {
      const colorBtn = document.createElement('button');
      colorBtn.style.width = '24px';
      colorBtn.style.height = '24px';
      colorBtn.style.backgroundColor = color;
      colorBtn.style.border = '1px solid #ccc';
      colorBtn.style.marginRight = '4px';
      colorBtn.style.cursor = 'pointer';
      colorBtn.title = `Color: ${color}`;
      
      colorBtn.addEventListener('click', () => {
        this.createMark(color);
      });
      
      colorGroup.appendChild(colorBtn);
    });

    // 样式选择器
    const styleGroup = document.createElement('div');
    
    this.toolbarConfig.styles.forEach(style => {
      const styleBtn = document.createElement('button');
      styleBtn.textContent = style.charAt(0).toUpperCase() + style.slice(1);
      styleBtn.style.marginRight = '8px';
      styleBtn.style.padding = '4px 8px';
      styleBtn.style.border = '1px solid #ccc';
      styleBtn.style.cursor = 'pointer';
      
      styleBtn.addEventListener('click', () => {
        this.createMark(undefined, style);
      });
      
      styleGroup.appendChild(styleBtn);
    });

    // 删除按钮
    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = 'Delete';
    deleteBtn.style.marginLeft = '8px';
    deleteBtn.style.padding = '4px 8px';
    deleteBtn.style.backgroundColor = '#f44336';
    deleteBtn.style.color = 'white';
    deleteBtn.style.border = 'none';
    deleteBtn.style.cursor = 'pointer';
    
    deleteBtn.addEventListener('click', () => {
      this.removeMarkAtSelection();
    });

    this.toolbarElement.appendChild(colorGroup);
    this.toolbarElement.appendChild(styleGroup);
    this.toolbarElement.appendChild(deleteBtn);
  }

  // 设置事件监听器
  private setupEventListeners(): void {
    document.addEventListener('mouseup', this.handleSelection.bind(this));
    document.addEventListener('selectionchange', this.handleSelectionChange.bind(this));
    
    if (this.toolbarConfig.autoHide) {
      document.addEventListener('click', this.handleDocumentClick.bind(this));
    }
  }

  // 生成简单的CFI
  private generateCFIFromRange(range: Range): SimpleCFI {
    const cfi = this.cfiProvider.generateCFIFromRange(range);
    
    return {
      path: cfi,
      chapterHref: this.cfiProvider.getCurrentChapterHref(),
      chapterTitle: this.cfiProvider.getCurrentChapterTitle()
    };
  }

  // 处理文本选择
  private handleSelection(event: MouseEvent): void {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const selectedText = range.toString().trim();
    
    if (selectedText.length === 0) {
      this.hideToolbar();
      return;
    }

    // 生成CFI信息
    const cfi = this.generateCFIFromRange(range);
    if (!cfi) return;

    this.currentSelection = {
      text: selectedText,
      cfi: cfi.path,
      range: range,
      chapterHref: cfi.chapterHref,
      chapterTitle: cfi.chapterTitle
    };

    this.showToolbar(event);
  }

  // 处理选择变化
  private handleSelectionChange(): void {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.toString().trim().length === 0) {
      this.currentSelection = null;
      this.hideToolbar();
    }
  }

  // 处理文档点击
  private handleDocumentClick(event: MouseEvent): void {
    if (this.toolbarElement && !this.toolbarElement.contains(event.target as Node)) {
      this.scheduleHide();
    }
  }

  // 显示工具栏
  private showToolbar(event: MouseEvent): void {
    if (!this.toolbarElement) return;

    // 重置隐藏计时器
    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }

    // 设置工具栏位置
    if (this.toolbarConfig.position === 'floating') {
      const x = event.clientX;
      const y = event.clientY;
      this.toolbarElement.style.left = `${x}px`;
      this.toolbarElement.style.top = `${y + 10}px`;
    }

    this.toolbarElement.style.display = 'block';
    this.isToolbarVisible = true;

    this.options.onToolbarToggle?.(true);
  }

  // 隐藏工具栏
  private hideToolbar(): void {
    if (!this.toolbarElement || !this.isToolbarVisible) return;

    this.toolbarElement.style.display = 'none';
    this.isToolbarVisible = false;

    this.options.onToolbarToggle?.(false);
  }

  // 计划隐藏工具栏
  private scheduleHide(): void {
    if (!this.toolbarConfig.autoHide || this.hideTimer) return;

    this.hideTimer = window.setTimeout(() => {
      this.hideToolbar();
      this.hideTimer = null;
    }, this.toolbarConfig.hideDelay);
  }

  // 创建标记
  public createMark(color?: string, styleType?: SVGMarkStyle['type']): SVGMark | null {
    if (!this.currentSelection || !this.svgContainer) return null;

    const markId = `mark-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const style: SVGMarkStyle = {
      type: styleType || 'highlight',
      color: color || '#ffeb3b',
      strokeWidth: 2,
      opacity: 0.7,
      padding: 2,
      ...this.getStyleDefaults(styleType || 'highlight')
    };

    const mark: SVGMark = {
      id: markId,
      cfi: this.currentSelection.cfi,
      text: this.currentSelection.text,
      style: style,
      created: new Date(),
      updated: new Date(),
      chapterHref: this.currentSelection.chapterHref,
      chapterTitle: this.currentSelection.chapterTitle
    };

    // 创建SVG元素
    const svgElement = this.createSVGElement(mark);
    if (!svgElement) return null;

    mark.element = svgElement;
    this.marks.set(markId, mark);
    this.svgContainer.appendChild(svgElement);

    // 清除选择
    window.getSelection()?.removeAllRanges();
    this.currentSelection = null;
    this.hideToolbar();

    // 触发事件
    this.options.onAnnotationCreated?.(this.convertToAnnotation(mark));

    return mark;
  }

  // 创建SVG元素
  private createSVGElement(mark: SVGMark): SVGElement | null {
    if (!this.currentSelection) return null;

    const range = this.currentSelection.range;
    const rects = range.getClientRects();
    
    if (rects.length === 0) return null;

    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('data-mark-id', mark.id);
    g.style.pointerEvents = 'auto';
    g.style.cursor = 'pointer';

    // 为每个选区矩形创建SVG元素
    for (let i = 0; i < rects.length; i++) {
      const rect = rects[i];
      const svgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      
      const containerRect = this.svgContainer!.getBoundingClientRect();
      svgRect.setAttribute('x', (rect.left - containerRect.left).toString());
      svgRect.setAttribute('y', (rect.top - containerRect.top).toString());
      svgRect.setAttribute('width', rect.width.toString());
      svgRect.setAttribute('height', rect.height.toString());
      
      // 根据样式类型设置属性
      this.applyStyleToElement(svgRect, mark.style, rect);
      
      g.appendChild(svgRect);
    }

    // 添加点击事件
    g.addEventListener('click', (event) => {
      event.stopPropagation();
      this.handleMarkClick(mark);
    });

    return g;
  }

  // 应用样式到SVG元素
  private applyStyleToElement(element: SVGRectElement, style: SVGMarkStyle, rect: DOMRect): void {
    switch (style.type) {
      case 'highlight':
        element.setAttribute('fill', style.color);
        element.setAttribute('fill-opacity', (style.opacity || 0.7).toString());
        element.setAttribute('rx', (style.radius || 2).toString());
        break;
        
      case 'underline':
        element.setAttribute('fill', 'none');
        element.setAttribute('stroke', style.color);
        element.setAttribute('stroke-width', (style.strokeWidth || 2).toString());
        element.setAttribute('stroke-dasharray', 'none');
        element.setAttribute('height', (style.strokeWidth || 2).toString());
        const containerRect = this.svgContainer!.getBoundingClientRect();
        element.setAttribute('y', (rect.bottom - containerRect.top - (style.strokeWidth || 2)).toString());
        break;
        
      case 'dashed':
        element.setAttribute('fill', 'none');
        element.setAttribute('stroke', style.color);
        element.setAttribute('stroke-width', (style.strokeWidth || 2).toString());
        element.setAttribute('stroke-dasharray', '5, 5');
        element.setAttribute('height', (style.strokeWidth || 2).toString());
        const dashedContainerRect = this.svgContainer!.getBoundingClientRect();
        element.setAttribute('y', (rect.bottom - dashedContainerRect.top - (style.strokeWidth || 2)).toString());
        break;
        
      case 'wavy':
        element.setAttribute('fill', 'none');
        element.setAttribute('stroke', style.color);
        element.setAttribute('stroke-width', (style.strokeWidth || 2).toString());
        element.setAttribute('stroke-dasharray', '2, 2');
        element.setAttribute('height', (style.strokeWidth || 2).toString());
        const wavyContainerRect = this.svgContainer!.getBoundingClientRect();
        element.setAttribute('y', (rect.bottom - wavyContainerRect.top - (style.strokeWidth || 2)).toString());
        break;
        
      default:
        element.setAttribute('fill', style.color);
        element.setAttribute('fill-opacity', (style.opacity || 0.7).toString());
    }
  }

  // 获取样式默认值
  private getStyleDefaults(styleType: SVGMarkStyle['type']): Partial<SVGMarkStyle> {
    switch (styleType) {
      case 'highlight':
        return { opacity: 0.7, radius: 2 };
      case 'underline':
      case 'dashed':
      case 'wavy':
        return { strokeWidth: 2, opacity: 1 };
      default:
        return { opacity: 0.7 };
    }
  }

  // 处理标记点击
  private handleMarkClick(mark: SVGMark): void {
    const annotation = this.convertToAnnotation(mark);
    this.options.onAnnotationCreated?.(annotation);
    
    // 创建自定义事件
    const event = new CustomEvent('markClick', {
      detail: {
        mark: mark,
        annotation: annotation
      }
    });
    document.dispatchEvent(event);
  }

  // 转换为标准Annotation格式
  private convertToAnnotation(mark: SVGMark): Annotation {
    return {
      id: mark.id,
      cfi: mark.cfi,
      text: mark.text,
      selectedText: mark.text,
      color: mark.style.color,
      created: mark.created,
      updated: mark.updated,
      style: {
        backgroundColor: mark.style.type === 'highlight' ? mark.style.color : undefined,
        textDecoration: ['underline', 'dashed', 'wavy'].includes(mark.style.type) ? 'underline' : undefined,
        borderStyle: mark.style.type === 'dashed' ? 'dashed' : mark.style.type === 'wavy' ? 'wavy' : undefined,
        opacity: mark.style.opacity
      },
      chapterHref: mark.chapterHref,
      chapterTitle: mark.chapterTitle
    };
  }

  // 删除选区处的标记
  public removeMarkAtSelection(): boolean {
    if (!this.currentSelection) return false;

    const markId = this.findMarkAtCFI(this.currentSelection.cfi);
    if (markId) {
      return this.removeMark(markId);
    }
    return false;
  }

  // 查找指定CFI处的标记
  private findMarkAtCFI(cfi: string): string | null {
    for (const [id, mark] of this.marks) {
      if (this.isCFIOverlap(mark.cfi, cfi)) {
        return id;
      }
    }
    return null;
  }

  // 检查CFI是否重叠
  private isCFIOverlap(cfi1: string, cfi2: string): boolean {
    // 简化实现，实际需要更精确的CFI比较
    return cfi1 === cfi2 || cfi1.startsWith(cfi2) || cfi2.startsWith(cfi1);
  }

  // 删除标记
  public removeMark(markId: string): boolean {
    const mark = this.marks.get(markId);
    if (!mark) return false;

    if (mark.element && this.svgContainer) {
      this.svgContainer.removeChild(mark.element);
    }
    
    this.marks.delete(markId);
    this.options.onAnnotationDeleted?.(markId);
    
    return true;
  }

  // 添加标记（从外部数据）
  public addMark(markData: Omit<SVGMark, 'id' | 'created' | 'updated'>): string {
    const markId = `mark-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const mark: SVGMark = {
      id: markId,
      ...markData,
      created: new Date(),
      updated: new Date()
    };

    // 创建SVG元素（简化实现）
    const svgElement = this.createSVGElementFromData(mark);
    if (svgElement) {
      mark.element = svgElement;
      this.svgContainer?.appendChild(svgElement);
    }

    this.marks.set(markId, mark);
    return markId;
  }

  // 从标记数据创建SVG元素（简化实现）
  private createSVGElementFromData(mark: SVGMark): SVGElement | null {
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('data-mark-id', mark.id);
    g.style.pointerEvents = 'auto';
    g.style.cursor = 'pointer';

    // 创建一个简单的矩形作为占位符
    const svgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    svgRect.setAttribute('x', '10');
    svgRect.setAttribute('y', '10');
    svgRect.setAttribute('width', '100');
    svgRect.setAttribute('height', '20');
    svgRect.setAttribute('fill', mark.style.color);
    svgRect.setAttribute('fill-opacity', (mark.style.opacity || 0.7).toString());
    
    g.appendChild(svgRect);

    // 添加点击事件
    g.addEventListener('click', (event) => {
      event.stopPropagation();
      this.handleMarkClick(mark);
    });

    return g;
  }

  // 批量添加标记
  public addMarks(marksData: Omit<SVGMark, 'id' | 'created' | 'updated'>[]): string[] {
    return marksData.map(mark => this.addMark(mark));
  }

  // 获取所有标记
  public getAllMarks(): SVGMark[] {
    return Array.from(this.marks.values());
  }

  // 获取指定章节的标记
  public getMarksByChapter(chapterHref: string): SVGMark[] {
    return Array.from(this.marks.values()).filter(mark => mark.chapterHref === chapterHref);
  }

  // 获取选中的文本信息
  public getSelectedTextInfo(): SelectionInfo | null {
    return this.currentSelection;
  }

  // 获取选中的CFI
  public getSelectedCFI(): string | null {
    return this.currentSelection?.cfi || null;
  }

  // 获取选中的文本
  public getSelectedText(): string | null {
    return this.currentSelection?.text || null;
  }

  // 更新标记样式
  public updateMarkStyle(markId: string, style: Partial<SVGMarkStyle>): boolean {
    const mark = this.marks.get(markId);
    if (!mark) return false;

    mark.style = { ...mark.style, ...style };
    mark.updated = new Date();

    // 重新创建SVG元素
    if (mark.element && this.svgContainer) {
      this.svgContainer.removeChild(mark.element);
    }
    
    const svgElement = this.createSVGElementFromData(mark);
    if (svgElement) {
      mark.element = svgElement;
      this.svgContainer?.appendChild(svgElement);
    }

    this.options.onAnnotationUpdated?.(this.convertToAnnotation(mark));
    return true;
  }

  // 清除所有标记
  public clearAllMarks(): void {
    if (this.svgContainer) {
      // 清除所有SVG标记元素
      const marks = this.svgContainer.querySelectorAll('[data-mark-id]');
      marks.forEach(mark => mark.remove());
    }
    
    this.marks.clear();
  }

  // 显示/隐藏工具栏
  public toggleToolbar(visible?: boolean): void {
    if (visible === undefined) {
      visible = !this.isToolbarVisible;
    }
    
    if (visible) {
      if (!this.currentSelection) {
        // 如果没有选区，在屏幕中央显示工具栏
        if (this.toolbarElement && this.toolbarConfig.position === 'floating') {
          this.toolbarElement.style.left = '50%';
          this.toolbarElement.style.top = '50%';
          this.toolbarElement.style.transform = 'translate(-50%, -50%)';
        }
        this.toolbarElement!.style.display = 'block';
        this.isToolbarVisible = true;
      }
    } else {
      this.hideToolbar();
    }
  }

  // 销毁管理器
  public destroy(): void {
    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }
    
    this.clearAllMarks();
    
    if (this.svgContainer && this.svgContainer.parentNode) {
      this.svgContainer.parentNode.removeChild(this.svgContainer);
    }
    
    document.removeEventListener('mouseup', this.handleSelection);
    document.removeEventListener('selectionchange', this.handleSelectionChange);
    document.removeEventListener('click', this.handleDocumentClick);
  }
}