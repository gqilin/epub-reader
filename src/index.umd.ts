// UMD入口 - 只导出默认的EPUBReader和功能类
import EPUBReader from './core/EPUBParser.js';
import EPUBViewer from './core/EPUBViewer.js';
import StyleController from './core/StyleController.js';

// 创建主类，包含其他功能
class EPUBReaderMain extends EPUBReader {
  static get Viewer(): typeof EPUBViewer {
    return EPUBViewer;
  }
  
  static get StyleController(): typeof StyleController {
    return StyleController;
  }
}

export default EPUBReaderMain;