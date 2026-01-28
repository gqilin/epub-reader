# 📚 EPUBReader 增强版使用指南

## 🎯 新功能概览

EPUBReader 现在支持DOM区域绑定和完整的样式控制系统，可以直接在网页中渲染EPUB内容并提供丰富的阅读体验。

## 🚀 快速开始

### 基本使用

```javascript
// 引入库
<script src="./dist/epubreader.js"></script>

<script>
// 创建阅读器实例
const viewer = new EPUBReader.Viewer({
    container: document.getElementById('reading-container'),
    contentArea: document.getElementById('content'),
    tocArea: document.getElementById('toc'),
    metadataArea: document.getElementById('metadata')
});

// 加载EPUB文件
const response = await fetch('book.epub');
const arrayBuffer = await response.arrayBuffer();
await viewer.load(arrayBuffer);
</script>
```

### HTML结构示例

```html
<div id="reading-container">
    <div id="metadata">书籍信息将显示在这里</div>
    <div id="toc">目录将显示在这里</div>
    <div id="content">章节内容将显示在这里</div>
</div>
```

## ⚙️ 配置选项

### 初始化配置

```javascript
const viewer = new EPUBReader.Viewer({
    // DOM区域绑定
    container: document.querySelector('.reading-area'),      // 主容器
    contentArea: document.getElementById('content'),         // 内容区域
    tocArea: document.getElementById('toc'),                  // 目录区域
    metadataArea: document.getElementById('metadata'),        // 元数据区域
    
    // 阅读设置
    fontSize: '16px',
    fontFamily: "'Microsoft YaHei', 'PingFang SC', sans-serif",
    fontColor: '#333333',
    backgroundColor: '#ffffff',
    lineHeight: '1.8',
    letterSpacing: '0px',
    paragraphSpacing: '1em',
    textAlign: 'left',
    maxWidth: '800px',
    padding: '20px',
    
    // 事件回调
    onChapterChange: (chapter) => console.log('章节切换:', chapter.title),
    onLoad: (book) => console.log('书籍加载完成'),
    onError: (error) => console.error('加载错误:', error)
});
```

## 🎨 样式控制

### 样式控制器

```javascript
// 创建样式控制器
const styleController = new EPUBReader.StyleController(viewer);

// 应用预设主题
styleController.applyTheme('dark');        // 深色主题
styleController.applyTheme('sepia');       // 护眼主题
styleController.applyTheme('paper');       // 纸质主题

// 应用字体
styleController.applyFont('serif');        // 衬线字体
styleController.applyFont('mono');         // 等宽字体
styleController.applyFont('reading');      // 阅读字体

// 应用字号
styleController.applyFontSize('lg');       // 大号字体

// 应用行高
styleController.applyLineHeight('loose');   // 宽松行高

// 自定义颜色
styleController.setFontColor('#e0e0e0');
styleController.setBackgroundColor('#1e1e1e');
```

### 直接样式设置

```javascript
// 更新单个样式属性
viewer.setFontSize('18px');
viewer.setFontFamily('Georgia, serif');
viewer.setFontColor('#333333');
viewer.setBackgroundColor('#ffffff');
viewer.setLineHeight('1.9');
viewer.setLetterSpacing('0.5px');
viewer.setParagraphSpacing('1.2em');
viewer.setTextAlign('justify');

// 批量更新样式
viewer.updateStyles({
    fontSize: '18px',
    lineHeight: '2.0',
    fontColor: '#2c2c2c',
    backgroundColor: '#fafafa'
});
```

## 🧭 导航功能

### 章节导航

```javascript
// 获取所有章节
const chapters = viewer.getChapters();
console.log(`共 ${chapters.length} 章`);

// 获取当前章节
const currentChapter = viewer.getCurrentChapter();

// 跳转到指定章节
await viewer.loadChapter('chapter1');
await viewer.loadChapterByHref('chapter1.html');

// 上一章/下一章
await viewer.nextChapter();
await viewer.previousChapter();
```

### 目录导航

```javascript
// 获取目录结构
const toc = viewer.getTableOfContents();
const flatTOC = toc.toArray(); // 扁平化目录

// 目录项自动绑定点击事件
// 用户点击目录项时自动跳转到对应章节
```

## 📊 获取信息

### 书籍信息

```javascript
// 获取元数据
const metadata = viewer.reader.getMetadata();
console.log('书名:', metadata.title);
console.log('作者:', metadata.creator);
console.log('语言:', metadata.language);
console.log('出版商:', metadata.publisher);

// 获取书籍对象
const book = viewer.getBook();
```

### 章节信息

```javascript
// 获取当前章节
const chapter = viewer.getCurrentChapter();
console.log('章节标题:', chapter.title);
console.log('字数:', chapter.getWordCount());
console.log('内容长度:', chapter.content.length);

// 获取纯文本内容
const plainText = chapter.getPlainText();
```

## 🎛️ 样式控制面板

### 创建控制面板

```javascript
// 自动创建样式控制面板
const controlPanel = styleController.createControlPanel();
document.getElementById('controls').appendChild(controlPanel);
```

### 获取预设选项

```javascript
// 获取所有主题
const themes = styleController.getThemes();
// [{ key: 'light', name: '浅色主题' }, ...]

// 获取所有字体
const fonts = styleController.getFonts();

// 获取所有字号
const fontSizes = styleController.getFontSizes();

// 获取所有行高
const lineHeights = styleController.getLineHeights();
```

## 🎭 预设主题

| 主题 | 背景 | 文字 | 描述 |
|------|------|------|------|
| `light` | #ffffff | #333333 | 浅色主题，适合白天阅读 |
| `dark` | #1e1e1e | #e0e0e0 | 深色主题，适合夜间阅读 |
| `sepia` | #f4f1e8 | #5c4b37 | 护眼主题，温暖色调 |
| `paper` | #fafafa | #2c2c2c | 纸质主题，模拟纸质书 |

## 🔧 字体预设

| 字体 | 描述 |
|------|------|
| `system` | 系统字体，兼容性好 |
| `serif` | 衬线字体，适合印刷风格 |
| `mono` | 等宽字体，适合代码内容 |
| `reading` | 专用阅读字体，优化阅读体验 |

## 📱 响应式设计

EPUBViewer 自动适应不同屏幕尺寸：

```css
/* 移动端适配 */
@media (max-width: 768px) {
    .epub-content-area {
        padding: 10px;
        font-size: 14px;
    }
}
```

## 🎯 事件系统

```javascript
// 章节变化事件
viewer.onChapterChange = function(chapter) {
    console.log('切换到章节:', chapter.title);
    // 更新进度条
    updateProgress(chapter);
};

// 书籍加载完成事件
viewer.onLoad = function(book) {
    console.log('书籍加载完成');
    // 显示目录
    showTableOfContents();
};

// 错误处理事件
viewer.onError = function(error) {
    console.error('加载错误:', error);
    // 显示错误提示
    showError(error.message);
};
```

## 🔍 搜索功能

```javascript
// 在当前书籍中搜索
const results = await viewer.reader.search('JavaScript', {
    caseSensitive: false,
    wholeWord: false
});

console.log(`找到 ${results.length} 个匹配项`);
results.forEach(result => {
    console.log(`章节: ${result.chapter.title}`);
    console.log(`匹配数: ${result.matches.length}`);
});
```

## 💾 设置持久化

```javascript
// 导出当前设置
const settings = styleController.exportSettings();
localStorage.setItem('epub-settings', JSON.stringify(settings));

// 导入设置
const savedSettings = localStorage.getItem('epub-settings');
if (savedSettings) {
    styleController.importSettings(JSON.parse(savedSettings));
}

// 保存当前设置为自定义样式
styleController.saveCurrentSettings('my-custom-theme');
styleController.applyCustomStyle('my-custom-theme');
```

## 🚨 错误处理

```javascript
try {
    await viewer.load(arrayBuffer);
} catch (error) {
    if (error.message.includes('parse')) {
        console.error('文件解析错误，请检查EPUB格式');
    } else if (error.message.includes('network')) {
        console.error('网络错误，请检查连接');
    } else {
        console.error('未知错误:', error);
    }
}
```

## 📋 完整示例

查看 `viewer-demo.html` 获取完整的功能演示，查看 `simple-viewer.html` 获取简洁的使用示例。

## 🔗 相关文件

- `viewer-demo.html` - 完整功能的演示页面
- `simple-viewer.html` - 简洁的使用示例
- `test-detailed.html` - 详细的测试页面
- `test-ncx.html` - NCX解析测试页面

---

🎉 **现在你可以在任何网页中轻松集成EPUB阅读功能了！**