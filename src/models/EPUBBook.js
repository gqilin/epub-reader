import Metadata from './Metadata';
import Chapter from './Chapter';
import TOCItem from './TOCItem';

class EPUBBook {
  constructor() {
    this.metadata = new Metadata();
    this.chapters = [];
    this.toc = null;
    this.manifest = {};
    this.spine = [];
    this.version = '';
    this.zip = null;
    this.rootPath = '';
  }

  addChapter(chapter) {
    this.chapters.push(chapter);
    this.chapters.sort((a, b) => a.order - b.order);
    return this;
  }

  getChapterById(id) {
    return this.chapters.find(chapter => chapter.id === id);
  }

  getChapterByHref(href) {
    return this.chapters.find(chapter => chapter.href === href);
  }

  setTableOfContents(tocRoot) {
    this.toc = tocRoot;
    return this;
  }

  getFlatTOC() {
    return this.toc ? this.toc.toArray() : [];
  }

  getTOCDepth() {
    if (!this.toc) return 0;
    
    let maxDepth = 0;
    
    function calculateDepth(item, currentDepth) {
      maxDepth = Math.max(maxDepth, currentDepth);
      item.children.forEach(child => calculateDepth(child, currentDepth + 1));
    }
    
    this.toc.children.forEach(child => calculateDepth(child, 1));
    return maxDepth;
  }

  getTotalWordCount() {
    return this.chapters
      .filter(chapter => chapter.isLoaded)
      .reduce((total, chapter) => total + chapter.getWordCount(), 0);
  }

  getSize() {
    return this.chapters
      .reduce((total, chapter) => total + chapter.size, 0);
  }

  async search(query, options = {}) {
    const { caseSensitive = false, wholeWord = false, regex = false } = options;
    const results = [];
    
    const searchRegex = regex 
      ? new RegExp(query, caseSensitive ? 'g' : 'gi')
      : new RegExp(
          wholeWord ? `\\b${query}\\b` : query,
          caseSensitive ? 'g' : 'gi'
        );

    this.chapters.forEach(chapter => {
      if (!chapter.isLoaded) return;
      
      const text = chapter.getPlainText();
      const matches = [];
      let match;
      
      while ((match = searchRegex.exec(text)) !== null) {
        matches.push({
          text: match[0],
          index: match.index,
          context: this.getContext(text, match.index, 50)
        });
      }
      
      if (matches.length > 0) {
        results.push({
          chapter: chapter,
          matches: matches
        });
      }
    });
    
    return results;
  }

  getContext(text, index, radius) {
    const start = Math.max(0, index - radius);
    const end = Math.min(text.length, index + radius);
    return text.substring(start, end).trim();
  }

  destroy() {
    this.chapters = [];
    this.toc = null;
    this.manifest = {};
    this.spine = [];
    this.zip = null;
  }
}

export default EPUBBook;