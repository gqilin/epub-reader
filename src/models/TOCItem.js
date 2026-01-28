class TOCItem {
  constructor(id, title, href, order = 0, level = 0, children = []) {
    this.id = id;
    this.title = title;
    this.href = href;
    this.order = order;
    this.level = level;
    this.children = children;
    this.parent = null;
  }

  addChild(child) {
    child.parent = this;
    this.children.push(child);
    return this;
  }

  findChildById(id) {
    if (this.id === id) return this;
    
    for (const child of this.children) {
      const found = child.findChildById(id);
      if (found) return found;
    }
    
    return null;
  }

  toArray() {
    const result = [{ ...this, children: undefined }];
    
    this.children.forEach(child => {
      result.push(...child.toArray());
    });
    
    return result;
  }

  static fromNCXNavItem(navItem, order = 0, level = 0) {
    const item = new TOCItem(
      navItem.id || '',
      navLabelContent(navItem),
      navItem.content?.src || '',
      order,
      level
    );

    if (navItem.navPoint) {
      const children = Array.isArray(navItem.navPoint) 
        ? navItem.navPoint 
        : [navItem.navPoint];
      
      children.forEach((child, index) => {
        item.addChild(TOCItem.fromNCXNavItem(child, index, level + 1));
      });
    }

    return item;
  }

  static fromNAVListItem(listItem, order = 0, level = 0) {
    const item = new TOCItem(
      listItem.id || '',
      listItem.label?.text || '',
      listItem.href || '',
      order,
      level
    );

    if (listItem.sublist) {
      listItem.sublist.forEach((child, index) => {
        item.addChild(TOCItem.fromNAVListItem(child, index, level + 1));
      });
    }

    return item;
  }
}

function navLabelContent(navPoint) {
  if (navPoint.navLabel?.text) {
    return navPoint.navLabel.text;
  }
  if (navPoint.text) {
    return navPoint.text;
  }
  return '';
}

export default TOCItem;