/**
 * Excel 课表解析器（基于 SheetJS）
 * 支持 .xls (OLE2) 和 .xlsx (ZIP+XML) 两种格式
 */

// SheetJS 在小程序 CommonJS 环境中通过 module.exports 导出
const XLSX = require('./xlsx.full.min.js');

/**
 * 解析 Excel 文件 ArrayBuffer
 * @param {ArrayBuffer} buffer
 * @returns {{ rows: string[][], error?: string }}
 */
function parseExcelFile(buffer) {
  try {
    // SheetJS 读取（支持 xls/xlsx/xlsb/ods 等）
    const workbook = XLSX.read(new Uint8Array(buffer), {
      type: 'array',
      cellFormula: false,
      cellStyles: false
      // 不设置 cellText，使用 SheetJS 默认行为
    });

    // 取第一个工作表
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) return { error: '文件中没有工作表' };

    const worksheet = workbook.Sheets[sheetName];

    // 转换为二维数组（raw: true 保留原始值，避免格式化干扰）
    const rows = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      defval: '',
      raw: true
    });

    if (!rows || rows.length === 0) {
      return { error: '工作表为空' };
    }

    console.log('[xlsxParser] 解析成功，行数:', rows.length, '首行列数:', rows[0] ? rows[0].length : 0);
    // 打印前 4 行内容用于调试
    for (let i = 0; i < Math.min(4, rows.length); i++) {
      const rowPreview = (rows[i] || []).slice(0, 9).map(function(v) {
        if (v === undefined || v === null || v === '') return '(空)';
        return String(v).replace(/\r?\n/g, '↵').substring(0, 30);
      }).join(' | ');
      console.log('[xlsxParser] 行' + i + ': ' + rowPreview);
    }

    return {
      rows,
      sheetName
    };
  } catch (e) {
    return { error: '文件解析失败: ' + (e.message || '未知错误') };
  }
}

/**
 * 从解析后的网格导入课程（教务处课表格式）
 * 调用方: courseManager.importFromXlsxGrid(rows)
 */
module.exports = {
  parseExcelFile
};
