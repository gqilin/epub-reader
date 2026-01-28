// UMD入口 - 只导出默认的EPUBReader和功能类
// @ts-ignore
import EPUBReader from './core/EPUBParser';
// @ts-ignore
import EPUBViewer from './core/EPUBViewer';
// @ts-ignore
import StyleController from './core/StyleController';

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