import { HighlightStyle, AnnotationConfig } from '../types/Annotation.js';

/**
 * 高亮样式预设
 */
export const HIGHLIGHT_PRESETS: Record<string, HighlightStyle> = {
  // 基础颜色高亮
  yellow: {
    backgroundColor: '#ffeb3b',
    border: 'none',
    color: '#000000',
    opacity: 0.7,
    borderRadius: '2px',
    className: 'highlight-yellow'
  },
  
  green: {
    backgroundColor: '#c8e6c9',
    border: 'none',
    color: '#2d5016',
    opacity: 0.7,
    borderRadius: '2px',
    className: 'highlight-green'
  },
  
  blue: {
    backgroundColor: '#bbdefb',
    border: 'none',
    color: '#0d47a1',
    opacity: 0.7,
    borderRadius: '2px',
    className: 'highlight-blue'
  },
  
  pink: {
    backgroundColor: '#f8bbd0',
    border: 'none',
    color: '#880e4f',
    opacity: 0.7,
    borderRadius: '2px',
    className: 'highlight-pink'
  },
  
  // 虚线样式
  dashedYellow: {
    backgroundColor: 'transparent',
    border: '2px dashed #ffeb3b',
    color: '#000000',
    opacity: 1,
    borderRadius: '2px',
    className: 'highlight-dashed-yellow'
  },
  
  dashedGreen: {
    backgroundColor: 'transparent',
    border: '2px dashed #c8e6c9',
    color: '#2d5016',
    opacity: 1,
    borderRadius: '2px',
    className: 'highlight-dashed-green'
  },
  
  // 波浪线样式
  wavyRed: {
    backgroundColor: 'transparent',
    border: 'none',
    color: '#d32f2f',
    opacity: 1,
    borderRadius: '2px',
    className: 'highlight-wavy-red',
    borderBottom: '3px wavy #d32f2f'
  },
  
  wavyBlue: {
    backgroundColor: 'transparent',
    border: 'none',
    color: '#1976d2',
    opacity: 1,
    borderRadius: '2px',
    className: 'highlight-wavy-blue',
    borderBottom: '3px wavy #1976d2'
  },
  
  // 双下划线
  doubleUnderline: {
    backgroundColor: 'transparent',
    border: 'none',
    color: '#ff6b6b',
    opacity: 1,
    borderRadius: '2px',
    className: 'highlight-double-underline',
    borderBottom: '3px double #ff6b6b'
  },
  
  // 点状线
  dottedPurple: {
    backgroundColor: 'transparent',
    border: '2px dotted #9c27b0',
    color: '#4a148c',
    opacity: 1,
    borderRadius: '2px',
    className: 'highlight-dotted-purple'
  },
  
  // 渐变高亮
  gradientSunset: {
    backgroundColor: 'linear-gradient(135deg, #ff9a56 0%, #ff6b6b 100%)',
    border: 'none',
    color: '#ffffff',
    opacity: 0.8,
    borderRadius: '4px',
    className: 'highlight-gradient-sunset'
  },
  
  gradientOcean: {
    backgroundColor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    border: 'none',
    color: '#ffffff',
    opacity: 0.8,
    borderRadius: '4px',
    className: 'highlight-gradient-ocean'
  },
  
  // 荧光效果
  markerYellow: {
    backgroundColor: '#fff59d',
    border: '1px solid #f57f17',
    color: '#263238',
    opacity: 0.9,
    borderRadius: '12px 4px',
    className: 'highlight-marker-yellow',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  
  markerPink: {
    backgroundColor: '#ff8a80',
    border: '1px solid #d32f2f',
    color: '#ffffff',
    opacity: 0.9,
    borderRadius: '12px 4px',
    className: 'highlight-marker-pink',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  
  // 荧记样式
  noteSticky: {
    backgroundColor: '#fff9c4',
    border: '1px solid #fbc02d',
    color: '#33691e',
    opacity: 0.9,
    borderRadius: '0 8px 0 0',
    className: 'highlight-note-sticky',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  
  // 删除线样式
  strikethrough: {
    backgroundColor: 'transparent',
    border: 'none',
    color: '#9e9e9e',
    opacity: 1,
    borderRadius: '2px',
    className: 'highlight-strikethrough',
    textDecoration: 'line-through 2px #9e9e9e'
  }
};

/**
 * 高亮样式管理器
 */
export class HighlightStyleManager {
  private customStyles: Map<string, HighlightStyle> = new Map();
  private config: AnnotationConfig;

  constructor(config: AnnotationConfig = {}) {
    this.config = {
      highlightPresets: HIGHLIGHT_PRESETS,
      defaultHighlightColor: 'yellow',
      enableCustomStyles: true,
      maxCustomStyles: 50,
      ...config
    };

    // 添加全局CSS样式
    this.addGlobalStyles();
  }

  /**
   * 获取预设样式
   * @param styleName 样式名称
   * @returns 高亮样式
   */
  getPreset(styleName: string): HighlightStyle | null {
    return this.config.highlightPresets?.[styleName] || null;
  }

  /**
   * 获取所有预设样式
   * @returns 所有预设样式
   */
  getAllPresets(): Record<string, HighlightStyle> {
    return this.config.highlightPresets || {};
  }

  /**
   * 创建自定义样式
   * @param name 样式名称
   * @param style 样式定义
   * @returns 是否创建成功
   */
  createCustomStyle(name: string, style: HighlightStyle): boolean {
    if (!this.config.enableCustomStyles) {
      return false;
    }

    if (this.customStyles.size >= (this.config.maxCustomStyles || 50)) {
      console.warn('Maximum custom styles limit reached');
      return false;
    }

    this.customStyles.set(name, style);
    this.addCustomStyleCSS(name, style);
    return true;
  }

  /**
   * 获取自定义样式
   * @param name 样式名称
   * @returns 自定义样式
   */
  getCustomStyle(name: string): HighlightStyle | null {
    return this.customStyles.get(name) || null;
  }

  /**
   * 获取所有自定义样式
   * @returns 所有自定义样式
   */
  getAllCustomStyles(): Map<string, HighlightStyle> {
    return new Map(this.customStyles);
  }

  /**
   * 删除自定义样式
   * @param name 样式名称
   * @returns 是否删除成功
   */
  removeCustomStyle(name: string): boolean {
    const removed = this.customStyles.delete(name);
    if (removed) {
      this.removeCustomStyleCSS(name);
    }
    return removed;
  }

  /**
   * 应用样式到元素
   * @param element DOM元素
   * @param style 样式名称或样式对象
   */
  applyStyle(element: HTMLElement, style: string | HighlightStyle): void {
    const styleObj = typeof style === 'string' 
      ? this.getPreset(style) || this.getCustomStyle(style)
      : style;

    if (!styleObj) {
      console.warn(`Style not found: ${style}`);
      return;
    }

    // 应用CSS类
    if (styleObj.className) {
      element.className = element.className
        .split(' ')
        .filter(cls => !cls.startsWith('highlight-'))
        .concat(styleObj.className)
        .join(' ');
    }

    // 应用内联样式
    Object.entries(styleObj).forEach(([key, value]) => {
      if (key !== 'className' && value) {
        element.style[key as any] = value;
      }
    });
  }

  /**
   * 获取样式预览HTML
   * @param styleName 样式名称
   * @returns 预览HTML
   */
  getStylePreview(styleName: string): string {
    const style = this.getPreset(styleName) || this.getCustomStyle(styleName);
    if (!style) {
      return '<span>Style not found</span>';
    }

    return `<span class="style-preview" data-style="${styleName}">示例文本</span>`;
  }

  /**
   * 根据条件推荐样式
   * @param condition 推荐条件
   * @returns 推荐的样式列表
   */
  recommendStyles(condition: 'reading' | 'study' | 'review' | 'coding'): string[] {
    switch (condition) {
      case 'reading':
        return ['yellow', 'green', 'markerYellow', 'noteSticky'];
      case 'study':
        return ['blue', 'dashedGreen', 'doubleUnderline', 'noteSticky'];
      case 'review':
        return ['pink', 'wavyRed', 'strikethrough', 'markerPink'];
      case 'coding':
        return ['gradientOcean', 'dottedPurple', 'wavyBlue'];
      default:
        return ['yellow'];
    }
  }

  /**
   * 导出样式配置
   * @returns 样式配置JSON
   */
  exportStyles(): string {
    const config = {
      presets: this.getAllPresets(),
      custom: Object.fromEntries(this.getAllCustomStyles()),
      version: '1.0.0'
    };
    
    return JSON.stringify(config, null, 2);
  }

  /**
   * 导入样式配置
   * @param configJson 样式配置JSON
   * @returns 是否导入成功
   */
  importStyles(configJson: string): boolean {
    try {
      const config = JSON.parse(configJson);
      
      // 导入自定义样式
      if (config.custom && typeof config.custom === 'object') {
Object.entries(config.custom).forEach(([name, style]) => {
          this.createCustomStyle(name, style as HighlightStyle);
        });
      }
      
      return true;
    } catch (error) {
      console.error('Failed to import styles:', error);
      return false;
    }
  }

  /**
   * 重置为默认样式
   */
  resetToDefaults(): void {
    this.customStyles.clear();
    this.removeCustomStylesCSS();
  }

  // 私有方法

  /**
   * 添加全局CSS样式
   */
  private addGlobalStyles(): void {
    const styleId = 'highlight-styles-global';
    
    // 移除已存在的样式
    const existingStyle = document.getElementById(styleId);
    if (existingStyle) {
      existingStyle.remove();
    }

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = this.generateGlobalCSS();
    document.head.appendChild(style);
  }

  /**
   * 生成全局CSS
   */
  private generateGlobalCSS(): string {
    return `
      /* 波浪线样式 */
      .highlight-wavy-red,
      .highlight-wavy-blue {
        text-decoration: underline;
        text-decoration-style: wavy;
      }
      
      /* 删除线样式 */
      .highlight-strikethrough {
        text-decoration: line-through;
        text-decoration-color: #9e9e9e;
        text-decoration-thickness: 2px;
      }
      
      /* 双下划线样式 */
      .highlight-double-underline {
        text-decoration: underline double;
      }
      
      /* 荧光样式 */
      .highlight-marker-yellow,
      .highlight-marker-pink {
        position: relative;
        z-index: 1;
      }
      
      /* 便利贴样式 */
      .highlight-note-sticky {
        position: relative;
        z-index: 1;
      }
      
      /* 样式预览 */
      .style-preview {
        display: inline-block;
        padding: 2px 4px;
        margin: 2px;
        cursor: pointer;
        border: 1px solid #ddd;
        border-radius: 2px;
      }
      
      .style-preview:hover {
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      }
      
      /* 高亮元素通用样式 */
      [class^="highlight-"] {
        transition: all 0.2s ease;
        cursor: pointer;
      }
      
      [class^="highlight-"]:hover {
        transform: scale(1.02);
        box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      }
    `;
  }

  /**
   * 添加自定义样式CSS
   */
  private addCustomStyleCSS(name: string, style: HighlightStyle): void {
    const styleId = `highlight-style-${name}`;
    
    // 移除已存在的样式
    const existingStyle = document.getElementById(styleId);
    if (existingStyle) {
      existingStyle.remove();
    }

    if (!style.className) {
      return;
    }

const styleElement = document.createElement('style');
    styleElement.id = styleId;
    styleElement.textContent = this.generateCustomStyleCSS(name, style);
    document.head.appendChild(styleElement);
  }

  /**
   * 生成自定义样式CSS
   */
  private generateCustomStyleCSS(name: string, style: HighlightStyle): string {
    let css = `/* Custom style: ${name} */\n.${style.className} {`;
    
    if (style.backgroundColor) {
      css += `background-color: ${style.backgroundColor};`;
    }
    
    if (style.border) {
      css += `border: ${style.border};`;
    }
    
    if (style.color) {
      css += `color: ${style.color};`;
    }
    
    if (style.opacity) {
      css += `opacity: ${style.opacity};`;
    }
    
    if (style.borderRadius) {
      css += `border-radius: ${style.borderRadius};`;
    }
    
    if (style.boxShadow) {
      css += `box-shadow: ${style.boxShadow};`;
    }
    
    if (style.textDecoration) {
      css += `text-decoration: ${style.textDecoration};`;
    }
    
    if (style.borderBottom) {
      css += `border-bottom: ${style.borderBottom};`;
    }
    
    css += '}';
    
    return css;
  }

  /**
   * 移除自定义样式CSS
   */
  private removeCustomStyleCSS(name: string): void {
    const styleId = `highlight-style-${name}`;
    const style = document.getElementById(styleId);
    if (style) {
      style.remove();
    }
  }

  /**
   * 移除所有自定义样式CSS
   */
  private removeCustomStylesCSS(): void {
    const styles = document.querySelectorAll('[id^="highlight-style-"]');
    styles.forEach(style => style.remove());
  }
}