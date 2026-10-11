/**
 * 课程数据管理工具
 * 负责课程的增删改查、单双周判定、Excel解析等
 */

// 生成唯一ID
function generateId() {
  return 'course_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// 获取所有课程
function getCourses() {
  return wx.getStorageSync('courses') || [];
}

// 保存课程列表
function saveCourses(courses) {
  wx.setStorageSync('courses', courses);
}

// 添加课程
function addCourse(course) {
  const courses = getCourses();
  course.id = generateId();
  course.createTime = Date.now();
  courses.push(course);
  saveCourses(courses);
  return course;
}

// 清除所有课程
function clearAllCourses() {
  wx.removeStorageSync('courses');
}

// 更新课程
function updateCourse(id, updates) {
  const courses = getCourses();
  const index = courses.findIndex(c => c.id === id);
  if (index !== -1) {
    courses[index] = { ...courses[index], ...updates };
    saveCourses(courses);
    return courses[index];
  }
  return null;
}

// 删除课程
function deleteCourse(id) {
  const courses = getCourses();
  const filtered = courses.filter(c => c.id !== id);
  saveCourses(filtered);
}

// 获取指定ID的课程
function getCourseById(id) {
  const courses = getCourses();
  return courses.find(c => c.id === id) || null;
}

/**
 * 判断某门课程在指定周是否有课
 * @param {Object} course 课程对象
 * @param {Number} week 周次
 * @returns {Boolean}
 */
function isCourseActiveInWeek(course, week) {
  // 如果用户手动指定了周数数组，直接判断
  if (course.weeks && course.weeks.length > 0) {
    return course.weeks.includes(week);
  }

  // 否则根据起始周、总周数、单双周计算
  const startWeek = course.startWeek || 1;
  const totalWeeks = course.totalWeeks || 16;
  const endWeek = startWeek + totalWeeks - 1;

  // 周次不在范围内
  if (week < startWeek || week > endWeek) {
    return false;
  }

  // 判断单双周
  const relativeWeek = week - startWeek + 1;
  if (course.weekType === 'odd' && relativeWeek % 2 === 0) {
    return false; // 单周课程在双周不上
  }
  if (course.weekType === 'even' && relativeWeek % 2 === 1) {
    return false; // 双周课程在单周不上
  }

  return true;
}

/**
 * 获取指定周次、指定星期的课程列表
 * @param {Number} week 周次
 * @param {Number} day 星期(1-7)
 * @returns {Array}
 */
function getCoursesByWeekAndDay(week, day) {
  const courses = getCourses();
  return courses.filter(c => {
    if (c.day !== day) return false;
    return isCourseActiveInWeek(c, week);
  }).sort((a, b) => a.startPeriod - b.startPeriod);
}

/**
 * 解析周数输入字符串为数组
 * 支持格式: "1-16"、"1,3,5,7-9"、"1-8单" 等
 * @param {String} input 用户输入的周数字符串
 * @returns {Array} 周数数组
 */
function parseWeeksInput(input) {
  if (!input || !input.trim()) return [];

  const trimmed = input.trim();

  // 尝试解析为数字数组
  // 支持: "1,2,3" "1-8" "1,3,5,7-9,11-16"
  const weeks = new Set();
  const parts = trimmed.split(/[,，]/);

  for (const part of parts) {
    const p = part.trim();
    if (p.includes('-')) {
      const [start, end] = p.split('-').map(Number);
      if (!isNaN(start) && !isNaN(end)) {
        for (let i = Math.min(start, end); i <= Math.max(start, end); i++) {
          weeks.add(i);
        }
      }
    } else {
      const num = Number(p);
      if (!isNaN(num)) {
        weeks.add(num);
      }
    }
  }

  return Array.from(weeks).sort((a, b) => a - b);
}

/**
 * 从JSON导入课程（Python转换器输出格式）
 * @param {Object} data { meta: {...}, courses: [...] }
 * @returns {Object} { count, meta }
 */
function importFromJSON(data) {
  if (!data || !data.courses || !Array.isArray(data.courses)) {
    throw new Error('无效的JSON格式，请使用convert_xls.py转换器');
  }

  const existingCourses = getCourses();
  const existingKeys = new Set();
  // 建立去重键：day-startPeriod-endPeriod-name
  existingCourses.forEach(c => {
    existingKeys.add(`${c.day}-${c.startPeriod}-${c.endPeriod}-${c.name}`);
  });

  let added = 0;
  data.courses.forEach(course => {
    const key = `${course.day}-${course.startPeriod}-${course.endPeriod}-${course.name}`;
    if (!existingKeys.has(key)) {
      const newCourse = {
        id: generateId(),
        name: course.name || '',
        teacher: course.teacher || '',
        location: course.location || '',
        day: course.day || 1,
        startPeriod: course.startPeriod || 1,
        endPeriod: course.endPeriod || 2,
        startWeek: course.startWeek || 1,
        totalWeeks: course.totalWeeks || 20,
        weekType: course.weekType || 'all',
        weeks: course.weeks || [],
        note: course.note || '',
        createTime: Date.now()
      };
      existingCourses.push(newCourse);
      existingKeys.add(key);
      added++;
    }
  });

  saveCourses(existingCourses);

  return {
    count: added,
    total: data.courses.length,
    skipped: data.courses.length - added,
    meta: data.meta || {}
  };
}

/**
 * 从Excel数据导入课程
 * 支持简单的CSV/TSV格式和JSON数组格式
 * @param {Array|String|Object} data 解析后的数据
 * @returns {Array} 成功导入的课程列表
 */
function importFromExcel(data) {
  // 如果是对象且有courses字段，则作为JSON导入
  if (data && typeof data === 'object' && !Array.isArray(data) && data.courses) {
    const result = importFromJSON(data);
    return result.count > 0 ? [{ _jsonImport: true, ...result }] : [];
  }

  const results = [];
  const rows = Array.isArray(data) ? data : parseCSV(data);

  for (const row of rows) {
    try {
      const course = parseRow(row);
      if (course && course.name) {
        const saved = addCourse(course);
        results.push(saved);
      }
    } catch (e) {
      console.warn('解析行失败:', row, e);
    }
  }

  return results;
}

/**
 * 从xlsx解析后的二维网格导入（教务处课表格式）
 * 对齐 Python convert_xls.py 的解析逻辑
 * @param {Array} grid 二维数组 rows[行][列]
 * @returns {Number} 导入数量
 */
function importFromXlsxGrid(grid) {
  if (!grid || grid.length < 3) {
    console.warn('[importFromXlsxGrid] grid 行数不足:', grid ? grid.length : 0);
    return 0;
  }

  const dayMap = { '星期一': 1, '星期二': 2, '星期三': 3, '星期四': 4, '星期五': 5, '星期六': 6, '星期日': 7, '周日': 7 };

  // 标准化 cell 文本：去除首尾空白，统一换行符
  // 处理 Rich Text 对象（.xls 多行文本）、Date 对象、字符串等类型
  function cellText(val) {
    if (val === undefined || val === null) return '';
    if (val instanceof Date) return val.toISOString();
    // 处理 Rich Text 对象：{ t:'s', v:'原文', r:[...] }
    if (typeof val === 'object' && val !== null) {
      return String(val.v || val.w || val.text || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
    }
    return String(val).replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  }

  // --- 找星期表头行（扫描所有行列，匹配至少 5 个星期名） ---
  let headerRow = -1;
  const dayCols = {};   // key: colIndex → day(1-7)
  for (let r = 0; r < grid.length; r++) {
    if (!grid[r]) continue;
    const map = {};
    let cnt = 0;
    // 扫描所有列（含 col 0）
    for (let c = 0; c < grid[r].length; c++) {
      const v = cellText(grid[r][c]);
      if (dayMap[v] !== undefined) { map[c] = dayMap[v]; cnt++; }
    }
    if (cnt >= 5) { headerRow = r; Object.assign(dayCols, map); break; }
  }
  if (headerRow < 0) {
    console.warn('[importFromXlsxGrid] 未找到星期表头行');
    return 0;
  }

  // --- 找节次行（与 Python 一致：col 0 含 "大节" 且含 "小节"） ---
  let periodCount = 0;
  const periodRows = {};  // key: rowIndex → { startPeriod, endPeriod }
  for (let r = headerRow + 1; r < grid.length; r++) {
    const c0 = cellText(grid[r] ? grid[r][0] : '');
    if (c0.indexOf('大节') >= 0 && c0.indexOf('小节') >= 0) {
      periodCount++;
      periodRows[r] = {
        startPeriod: (periodCount - 1) * 2 + 1,
        endPeriod: periodCount * 2
      };
    }
    // 已找到 6 大节后停止（避免误匹配后续行）
    if (periodCount >= 6) break;
  }
  if (periodCount === 0) {
    console.warn('[importFromXlsxGrid] 未找到节次行');
    return 0;
  }

  // --- 解析每个单元格 ---
  const existing = getCourses();
  const keys = new Set(existing.map(c => `${c.day}-${c.startPeriod}-${c.endPeriod}-${c.name}`));
  let imported = 0;

  for (const [rStr, period] of Object.entries(periodRows)) {
    const r = parseInt(rStr);
    for (const [cStr, day] of Object.entries(dayCols)) {
      const c = parseInt(cStr);
      const text = cellText(grid[r] ? grid[r][c] : '');
      if (!text) continue;

      // 按空行分割多门课程
      const blocks = text.split(/\n\s*\n/);
      for (const block of blocks) {
        const rawLines = block.trim().split('\n').map(l => l.trim()).filter(Boolean);
        if (rawLines.length < 2) continue;

        // 分类每一行（对齐 Python parse_cell 逻辑）
        let name = '';
        let teacher = '';
        let location = '';
        let weeks = [];
        let weekType = 'all';
        let note = '';
        const otherLines = [];

        for (let i = 0; i < rawLines.length; i++) {
          const line = rawLines[i];

          // 备注行: (xxx)，短行
          if (/^\([^)]+\)$/.test(line) && line.length < 20) {
            note = line.replace(/[()]/g, '');
            continue;
          }

          // 周次/节次行: 含 [01-02节] 模式
          if (/\[\d{2}[-–,]\d{2}节\]/.test(line)) {
            // 提取周次部分（节次信息之前的内容）
            let weekPart = line.replace(/\[.*?节\].*/, '').replace(/[\[\(][^\]\)]*[\]\)]/g, '').trim();
            // 判断单双周
            if (/[单]/.test(line)) weekType = 'odd';
            else if (/[双]/.test(line)) weekType = 'even';
            else weekType = 'all';
            // 解析周次
            if (weekPart) {
              // 清理残留括号和逗号分隔
              weekPart = weekPart.replace(/[\(\)\[\]]/g, '').trim();
              weeks = parseWeeksInput(weekPart);
            }
            continue;
          }

          // 地点行（含校区/楼/机房/外语）
          if (/(校区|楼\d|机房|外语)/.test(line)) {
            location = line;
            continue;
          }

          // 其他行 → 收集（课程名/教师）
          otherLines.push(line);
        }

        // 分配课程名和教师
        if (otherLines.length > 0) {
          name = otherLines[0];
          if (otherLines.length >= 2) {
            teacher = otherLines[1];
          }
        }

        // 基本校验
        if (!name || name.length > 60) continue;
        const key = `${day}-${period.startPeriod}-${period.endPeriod}-${name}`;
        if (keys.has(key)) continue;

        addCourse({
          name,
          teacher,
          location,
          day,
          startPeriod: period.startPeriod,
          endPeriod: period.endPeriod,
          startWeek: 1,
          totalWeeks: 20,
          weekType,
          weeks,
          note
        });
        keys.add(key);
        imported++;
      }
    }
  }
  console.log('[importFromXlsxGrid] 共导入:', imported);
  return imported;
}

// 简单的CSV解析
function parseCSV(text) {
  const lines = text.split(/[\r\n]+/).filter(l => l.trim());
  if (lines.length === 0) return [];

  // 自动检测分隔符（逗号或制表符）
  const sep = lines[0].includes('\t') ? '\t' : ',';

  const headers = lines[0].split(sep).map(h => h.trim());
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(sep).map(v => v.trim());
    if (values.length === 0) continue;

    const row = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] || '';
    });
    rows.push(row);
  }

  return rows;
}

// 将Excel行解析为课程对象
function parseRow(row) {
  // 支持中英文表头
  const name = row['课程名'] || row['课程名称'] || row['name'] || row['课程'] || '';
  const teacher = row['教师'] || row['老师'] || row['teacher'] || row['任课教师'] || '';
  const location = row['地点'] || row['教室'] || row['location'] || row['上课地点'] || '';
  const day = parseInt(row['星期'] || row['day'] || row['周几'] || '1');
  const startPeriod = parseInt(row['起始节次'] || row['startPeriod'] || row['开始节次'] || '1');
  const endPeriod = parseInt(row['结束节次'] || row['endPeriod'] || row['截止节次'] || String(startPeriod + 1));
  const startWeek = parseInt(row['起始周'] || row['startWeek'] || row['开始周'] || '1');
  const totalWeeks = parseInt(row['总周数'] || row['totalWeeks'] || row['周数'] || '16');

  // 单双周
  let weekType = 'all';
  const wt = (row['单双周'] || row['weekType'] || row['周类型'] || '').trim();
  if (wt.includes('单') || wt === 'odd') weekType = 'odd';
  if (wt.includes('双') || wt === 'even') weekType = 'even';

  return {
    name,
    teacher,
    location,
    day: Math.max(1, Math.min(7, day || 1)),
    startPeriod: Math.max(1, Math.min(12, startPeriod || 1)),
    endPeriod: Math.max(startPeriod || 1, Math.min(12, endPeriod || startPeriod + 1)),
    startWeek: Math.max(1, startWeek || 1),
    totalWeeks: Math.max(1, totalWeeks || 16),
    weekType,
    weeks: []
  };
}

// 学期起始日期相关（默认 2026-03-02 为第一周第一天）
function getSemesterStart() {
  return wx.getStorageSync('semesterStart') || '2026-03-02';
}

function setSemesterStart(date) {
  wx.setStorageSync('semesterStart', date);
}

// 根据学期起始日期计算当前周次
function calculateCurrentWeek(semesterStart) {
  if (!semesterStart) return 1;
  const start = new Date(semesterStart);
  const now = new Date();
  const diffMs = now.getTime() - start.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const week = Math.floor(diffDays / 7) + 1;
  return Math.max(1, week);
}

// 获取当前周次
function getCurrentWeek() {
  const saved = wx.getStorageSync('currentWeek');
  if (saved) return saved;
  const start = getSemesterStart();
  return calculateCurrentWeek(start);
}

// 设置当前周次
function setCurrentWeek(week) {
  wx.setStorageSync('currentWeek', week);
}

// 获取某课程在指定周的显示信息
function getCourseWeekInfo(course, week) {
  if (!isCourseActiveInWeek(course, week)) return null;

  let weekLabel = '';
  if (course.weeks && course.weeks.length > 0) {
    weekLabel = `第${week}周`;
  } else {
    const relativeWeek = week - (course.startWeek || 1) + 1;
    if (course.weekType === 'odd') {
      weekLabel = `第${week}周(单)`;
    } else if (course.weekType === 'even') {
      weekLabel = `第${week}周(双)`;
    } else {
      weekLabel = `第${week}周`;
    }
  }

  return {
    weekLabel,
    course
  };
}

module.exports = {
  generateId,
  getCourses,
  saveCourses,
  addCourse,
  updateCourse,
  deleteCourse,
  clearAllCourses,
  getCourseById,
  isCourseActiveInWeek,
  getCoursesByWeekAndDay,
  parseWeeksInput,
  importFromExcel,
  importFromJSON,
  importFromXlsxGrid,
  parseRow,
  getSemesterStart,
  setSemesterStart,
  calculateCurrentWeek,
  getCurrentWeek,
  setCurrentWeek
};
