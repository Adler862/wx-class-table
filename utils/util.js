/**
 * 通用工具函数
 */

// 星期映射
const weekDayMap = ['一', '二', '三', '四', '五', '六', '日'];
const weekDayFullMap = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

function formatWeekDay(day, full = false) {
  const map = full ? weekDayFullMap : weekDayMap;
  return map[day - 1] || day;
}
function getWeekDates(semesterStart, currentWeek) {
  const start = new Date(semesterStart);                    // 学期第一周周一
  const mon = new Date(start);                              // 当前周周一
  mon.setDate(start.getDate() + (currentWeek - 1) * 7);
  
  const dates = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(mon);
    d.setDate(mon.getDate() + i);
    dates.push((d.getMonth() + 1) + '/' + d.getDate());   // "3/2" 格式
  }
  return dates;
}
// 获取6大节信息（与学校教务处一致）
// 每大节=2小节,共12小节
function getPeriods() {
  return [
    { section: '第一大节', subs: '01,02', time: '08:30-10:10', periods: [1, 2] },
    { section: '第二大节', subs: '03,04', time: '10:30-12:10', periods: [3, 4] },
    { section: '第三大节', subs: '05,06', time: '14:30-16:10', periods: [5, 6] },
    { section: '第四大节', subs: '07,08', time: '16:30-18:10', periods: [7, 8] },
    { section: '第五大节', subs: '09,10', time: '19:30-21:10', periods: [9, 10] },
    { section: '第六大节', subs: '11,12', time: '21:20-23:00', periods: [11, 12] }
  ];
}

// 获取所有12个小节的节次信息
function getSubPeriods() {
  const times = {
    1: '08:00-08:45', 2: '08:55-09:40',
    3: '10:30-11:15', 4: '11:25-12:10',
    5: '14:30-15:15', 6: '15:25-16:10',
    7: '16:30-17:15', 8: '17:25-18:10',
    9: '19:30-20:15', 10: '20:25-21:10',
    11: '21:20-22:05', 12: '22:15-23:00'
  };
  const result = [];
  for (let i = 1; i <= 12; i++) {
    result.push({ period: i, time: times[i] || '' });
  }
  return result;
}

// 根据小节号获取所属大节索引 (0-5)
function getMajorSectionIndex(period) {
  return Math.floor((period - 1) / 2);
}

// 随机颜色（用于课程卡片背景）
const courseColors = [
  '#E3F2FD', '#FFF3E0', '#E8F5E9', '#FCE4EC',
  '#F3E5F5', '#E0F7FA', '#FFF8E1', '#E8EAF6',
  '#F1F8E9', '#EDE7F6', '#FBE9E7', '#E1F5FE',
  '#E0F2F1', '#F9FBE7', '#EFEBE9', '#E1BEE7'
];

function getCourseColor(index) {
  return courseColors[index % courseColors.length];
}

// 格式化日期
function formatDate(date) {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

module.exports = {
  weekDayMap,
  weekDayFullMap,
  formatWeekDay,
  getPeriods,
  getSubPeriods,
  getMajorSectionIndex,
  courseColors,
  getCourseColor,
  formatDate,
  getWeekDates
};
