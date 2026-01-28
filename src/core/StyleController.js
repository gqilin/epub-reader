class StyleController {
  constructor(viewer) {
    this.viewer = viewer;
    this.currentTheme = 'light';
    this.customStyles = {};
    this.presets = this.createPresets();
  }
  
  createPresets() {
    return {
      // 内置主题
      themes: {
        light: {
          name: '浅色主题',
          backgroundColor: '#ffffff',
          fontColor: '#333333',
          fontSize: '16px',
          fontFamily: "'Microsoft YaHei', 'PingFang SC', sans-serif",
          lineHeight: '1.8',
          letterSpacing: '0px'
        },
        dark: {
          name: '深色主题',
          backgroundColor: '#1e1e1e',
          fontColor: '#e0e0e0',
          fontSize: '16px',
          fontFamily: "'Microsoft YaHei', 'PingFang SC', sans-serif",
          lineHeight: '1.8',
          letterSpacing: '0px'
        },
        sepia: {
          name: '护眼主题',
          backgroundColor: '#f4f1e8',
          fontColor: '#5c4b37',
          fontSize: '16px',
          fontFamily: "'Microsoft YaHei', 'PingFang SC', sans-serif",
          lineHeight: '1.8',
          letterSpacing: '0px'
        },
        paper: {
          name: '纸质主题',
          backgroundColor: '#fafafa',
          fontColor: '#2c2c2c',
          fontSize: '16px',
          fontFamily: 'Georgia, serif',
          lineHeight: '1.9',
          letterSpacing: '0.5px'
        }
      },
      
      // 字体预设
      fonts: {
        system: {
          name: '系统字体',
          fontFamily: "'Microsoft YaHei', 'PingFang SC', 'Hiragino Sans GB', sans-serif"
        },
        serif: {
          name: '衬线字体',
          fontFamily: 'Georgia, "Times New Roman", serif'
        },
        mono: {
          name: '等宽字体',
          fontFamily: "'Consolas', 'Monaco', monospace"
        },
        reading: {
          name: '阅读字体',
          fontFamily: '"Source Han Sans CN", "PingFang SC", "Microsoft YaHei", sans-serif'
        }
      },
      
      // 字号预设
      fontSizes: {
        xs: { name: '极小', size: '12px' },
        sm: { name: '小', size: '14px' },
        md: { name: '中', size: '16px' },
        lg: { name: '大', size: '18px' },
        xl: { name: '极大', size: '20px' },
        xxl: { name: '超大', size: '24px' }
      },
      
      // 行高预设
      lineHeights: {
        compact: { name: '紧凑', height: '1.4' },
        normal: { name: '正常', height: '1.6' },
        comfortable: { name: '舒适', height: '1.8' },
        loose: { name: '宽松', height: '2.0' }
      },
      
      // 段间距预设
      paragraphSpacings: {
        tight: { name: '紧密', spacing: '0.5em' },
        normal: { name: '正常', spacing: '1em' },
        loose: { name: '宽松', spacing: '1.5em' }
      }
    };
  }
  
  // 应用主题
  applyTheme(themeName) {
    const theme = this.presets.themes[themeName];
    if (!theme) {
      console.warn(`主题 "${themeName}" 不存在`);
      return;
    }
    
    this.currentTheme = themeName;
    this.viewer.updateStyles(theme);
    
    // 触发主题变化事件
    this.viewer.container?.dispatchEvent(new CustomEvent('themechange', {
      detail: { theme: themeName, settings: theme }
    }));
  }
  
  // 获取当前主题
  getCurrentTheme() {
    return this.currentTheme;
  }
  
  // 获取所有主题
  getThemes() {
    return Object.keys(this.presets.themes).map(key => ({
      key,
      ...this.presets.themes[key]
    }));
  }
  
  // 应用字体
  applyFont(fontKey) {
    const font = this.presets.fonts[fontKey];
    if (!font) {
      console.warn(`字体 "${fontKey}" 不存在`);
      return;
    }
    
    this.viewer.setFontFamily(font.fontFamily);
  }
  
  // 获取所有字体
  getFonts() {
    return Object.keys(this.presets.fonts).map(key => ({
      key,
      ...this.presets.fonts[key]
    }));
  }
  
  // 应用字号
  applyFontSize(sizeKey) {
    const fontSize = this.presets.fontSizes[sizeKey];
    if (!fontSize) {
      console.warn(`字号 "${sizeKey}" 不存在`);
      return;
    }
    
    this.viewer.setFontSize(fontSize.size);
  }
  
  // 获取所有字号
  getFontSizes() {
    return Object.keys(this.presets.fontSizes).map(key => ({
      key,
      ...this.presets.fontSizes[key]
    }));
  }
  
  // 应用行高
  applyLineHeight(heightKey) {
    const lineHeight = this.presets.lineHeights[heightKey];
    if (!lineHeight) {
      console.warn(`行高 "${heightKey}" 不存在`);
      return;
    }
    
    this.viewer.setLineHeight(lineHeight.height);
  }
  
  // 获取所有行高
  getLineHeights() {
    return Object.keys(this.presets.lineHeights).map(key => ({
      key,
      ...this.presets.lineHeights[key]
    }));
  }
  
  // 应用段间距
  applyParagraphSpacing(spacingKey) {
    const spacing = this.presets.paragraphSpacings[spacingKey];
    if (!spacing) {
      console.warn(`段间距 "${spacingKey}" 不存在`);
      return;
    }
    
    this.viewer.setParagraphSpacing(spacing.spacing);
  }
  
  // 获取所有段间距
  getParagraphSpacings() {
    return Object.keys(this.presets.paragraphSpacings).map(key => ({
      key,
      ...this.presets.paragraphSpacings[key]
    }));
  }
  
  // 自定义颜色
  setFontColor(color) {
    this.viewer.setFontColor(color);
  }
  
  setBackgroundColor(color) {
    this.viewer.setBackgroundColor(color);
  }
  
  // 设置字间距
  setLetterSpacing(spacing) {
    this.viewer.setLetterSpacing(spacing);
  }
  
  // 设置文本对齐
  setTextAlign(align) {
    this.viewer.setTextAlign(align);
  }
  
  // 创建自定义样式
  createCustomStyle(name, styles) {
    this.customStyles[name] = styles;
  }
  
  // 应用自定义样式
  applyCustomStyle(name) {
    const styles = this.customStyles[name];
    if (!styles) {
      console.warn(`自定义样式 "${name}" 不存在`);
      return;
    }
    
    this.viewer.updateStyles(styles);
  }
  
  // 获取自定义样式
  getCustomStyles() {
    return Object.keys(this.customStyles).map(key => ({
      key,
      name: key,
      styles: this.customStyles[key]
    }));
  }
  
  // 保存当前设置
  saveCurrentSettings(name) {
    const currentSettings = this.viewer.getSettings();
    this.createCustomStyle(name, currentSettings);
  }
  
  // 重置为默认设置
  resetToDefault() {
    this.applyTheme('light');
  }
  
  // 获取当前所有设置
  getCurrentSettings() {
    return this.viewer.getSettings();
  }
  
  // 导出设置为JSON
  exportSettings() {
    return {
      theme: this.currentTheme,
      settings: this.getCurrentSettings(),
      customStyles: this.customStyles
    };
  }
  
  // 从JSON导入设置
  importSettings(settingsData) {
    try {
      if (settingsData.theme) {
        this.applyTheme(settingsData.theme);
      }
      
      if (settingsData.settings) {
        this.viewer.updateStyles(settingsData.settings);
      }
      
      if (settingsData.customStyles) {
        this.customStyles = { ...this.customStyles, ...settingsData.customStyles };
      }
      
    } catch (error) {
      console.error('导入设置失败:', error);
    }
  }
  
  // 创建样式控制面板
  createControlPanel(container) {
    const panel = document.createElement('div');
    panel.className = 'epub-style-control-panel';
    panel.innerHTML = `
      <div class="style-controls">
        <div class="control-group">
          <label>主题:</label>
          <select id="theme-select">
            ${this.getThemes().map(theme => 
              `<option value="${theme.key}">${theme.name}</option>`
            ).join('')}
          </select>
        </div>
        
        <div class="control-group">
          <label>字体:</label>
          <select id="font-select">
            ${this.getFonts().map(font => 
              `<option value="${font.key}">${font.name}</option>`
            ).join('')}
          </select>
        </div>
        
        <div class="control-group">
          <label>字号:</label>
          <select id="fontsize-select">
            ${this.getFontSizes().map(size => 
              `<option value="${size.key}">${size.name}</option>`
            ).join('')}
          </select>
        </div>
        
        <div class="control-group">
          <label>行高:</label>
          <select id="lineheight-select">
            ${this.getLineHeights().map(height => 
              `<option value="${height.key}">${height.name}</option>`
            ).join('')}
          </select>
        </div>
        
        <div class="control-group">
          <label>文字颜色:</label>
          <input type="color" id="fontcolor-input" value="#333333">
        </div>
        
        <div class="control-group">
          <label>背景颜色:</label>
          <input type="color" id="bgcolor-input" value="#ffffff">
        </div>
        
        <div class="control-group">
          <button id="reset-styles">重置样式</button>
        </div>
      </div>
    `;
    
    // 添加样式
    const style = document.createElement('style');
    style.textContent = `
      .epub-style-control-panel {
        background: #f5f5f5;
        padding: 15px;
        border-radius: 5px;
        margin: 10px 0;
      }
      
      .style-controls {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 15px;
      }
      
      .control-group {
        display: flex;
        flex-direction: column;
        gap: 5px;
      }
      
      .control-group label {
        font-weight: bold;
        font-size: 12px;
        color: #666;
      }
      
      .control-group select,
      .control-group input {
        padding: 5px;
        border: 1px solid #ddd;
        border-radius: 3px;
      }
      
      .control-group button {
        padding: 8px 15px;
        background: #007bff;
        color: white;
        border: none;
        border-radius: 3px;
        cursor: pointer;
      }
      
      .control-group button:hover {
        background: #0056b3;
      }
    `;
    document.head.appendChild(style);
    
    // 绑定事件
    this.bindControlEvents(panel);
    
    // 添加到容器
    if (container) {
      container.appendChild(panel);
    }
    
    return panel;
  }
  
  // 绑定控制面板事件
  bindControlEvents(panel) {
    // 主题选择
    const themeSelect = panel.querySelector('#theme-select');
    themeSelect.addEventListener('change', (e) => {
      this.applyTheme(e.target.value);
    });
    
    // 字体选择
    const fontSelect = panel.querySelector('#font-select');
    fontSelect.addEventListener('change', (e) => {
      this.applyFont(e.target.value);
    });
    
    // 字号选择
    const fontSizeSelect = panel.querySelector('#fontsize-select');
    fontSizeSelect.addEventListener('change', (e) => {
      this.applyFontSize(e.target.value);
    });
    
    // 行高选择
    const lineHeightSelect = panel.querySelector('#lineheight-select');
    lineHeightSelect.addEventListener('change', (e) => {
      this.applyLineHeight(e.target.value);
    });
    
    // 文字颜色
    const fontColorInput = panel.querySelector('#fontcolor-input');
    fontColorInput.addEventListener('change', (e) => {
      this.setFontColor(e.target.value);
    });
    
    // 背景颜色
    const bgColorInput = panel.querySelector('#bgcolor-input');
    bgColorInput.addEventListener('change', (e) => {
      this.setBackgroundColor(e.target.value);
    });
    
    // 重置按钮
    const resetButton = panel.querySelector('#reset-styles');
    resetButton.addEventListener('click', () => {
      this.resetToDefault();
      // 重置控件值
      themeSelect.value = 'light';
      fontColorInput.value = '#333333';
      bgColorInput.value = '#ffffff';
    });
  }
}

export default StyleController;