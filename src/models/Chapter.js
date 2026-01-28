class Chapter {
  constructor(id, href, title = '', order = 0) {
    this.id = id;
    this.href = href;
    this.title = title;
    this.order = order;
    this.content = '';
    this.mediaType = '';
    this.size = 0;
    this.isLoaded = false;
  }

  setContent(content, mediaType = 'application/xhtml+xml') {
    this.content = content;
    this.mediaType = mediaType;
    this.size = content ? content.length : 0;
    this.isLoaded = true;
    return this;
  }

  getPlainText() {
    if (!this.content) return '';
    
    // 简单的HTML标签移除
    return this.content
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  getWordCount() {
    const text = this.getPlainText();
    return text.split(/\s+/).filter(word => word.length > 0).length;
  }

  static fromOPFSpineItem(spineItem, manifest, order) {
    const manifestItem = manifest[spineItem.idref];
    if (!manifestItem) {
      throw new Error(`Manifest item not found for spine item: ${spineItem.idref}`);
    }

    return new Chapter(
      spineItem.idref,
      manifestItem.href,
      manifestItem.href.split('/').pop().replace(/\.[^/.]+$/, ''),
      order
    );
  }
}

export default Chapter;