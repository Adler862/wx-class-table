const courseManager = require('../../utils/courseManager');
const util = require('../../utils/util');
const xlsxParser = require('../../utils/xlsxParser');

Page({
  data: {
    weekDates: [],
    currentWeek: 1,
    maxWeek: 20,
    weekDays: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
    periodSections: util.getPeriods(),  // 6大节
    scheduleGrid: [],      // 课表二维数组 [大节(0-5)][星期(0-6)] → {courses:[], rowspan:1}
    showDetail: false,
    detailCourse: null,
    showSemesterSetting: false,
    semesterStart: '2026-03-02',
    hasCourses: false,
    allCoursesCount: 0
  },

  onLoad() {
    this._loading = false;
    this.loadData();
  },

  onShow() {
    // 防止短时间内重复加载（WeChat 某些版本 onShow 可能被多次触发）
    if (this._loading) return;
    this.loadData();
  },

  // ==================== 数据加载 ====================
  loadData() {
    try {
      this._loading = true;
      const currentWeek = courseManager.getCurrentWeek();
      const semesterStart = courseManager.getSemesterStart();
      const courses = courseManager.getCourses();

      const scheduleGrid = this.buildScheduleGrid(currentWeek);
      const weekDates = util.getWeekDates(semesterStart, currentWeek);

      this.setData({
        currentWeek,
        semesterStart,
        scheduleGrid,
        weekDates,
        hasCourses: courses.length > 0,
        allCoursesCount: courses.length
      });
    } catch (e) {
      console.error('[loadData] 异常:', e);
    } finally {
      this._loading = false;
    }
  },

  // 构建6大节×7天课表网格
  buildScheduleGrid(week) {
    const grid = [];

    // 初始化 6行 × 7列
    for (let r = 0; r < 6; r++) {
      grid[r] = [];
      for (let d = 0; d < 7; d++) {
        grid[r][d] = { courses: [] };
      }
    }

    // 获取当前周的所有活跃课程
    const courses = courseManager.getCourses();
    const activeCourses = courses.filter(c =>
      courseManager.isCourseActiveInWeek(c, week)
    );

    // 填充网格
    activeCourses.forEach((course, idx) => {
      const col = course.day - 1;
      // 计算所属大节行索引
      const majorRow = Math.floor((course.startPeriod - 1) / 2);
      if (majorRow < 0 || majorRow >= 6) return;

      const rowspan = Math.ceil((course.endPeriod - course.startPeriod + 1) / 2);
      const color = util.getCourseColor(idx);

      grid[majorRow][col].courses.push({
        ...course,
        rowspan: Math.min(rowspan, 6 - majorRow),
        color
      });
    });

    return grid;
  },

  // ==================== 周次操作 ====================
  prevWeek() {
    if (this.data.currentWeek > 1) {
      this.changeWeek(this.data.currentWeek - 1);
    }
  },

  nextWeek() {
    if (this.data.currentWeek < this.data.maxWeek) {
      this.changeWeek(this.data.currentWeek + 1);
    }
  },

  changeWeek(week) {
    courseManager.setCurrentWeek(week);
    const scheduleGrid = this.buildScheduleGrid(week);
    const weekDates = util.getWeekDates(courseManager.getSemesterStart(), week);
    this.setData({ currentWeek: week, scheduleGrid, weekDates });
  },

  onWeekInputChange(e) {
    let week = parseInt(e.detail.value) || 1;
    week = Math.max(1, Math.min(this.data.maxWeek, week));
    this.changeWeek(week);
  },

  jumpToCurrentWeek() {
    const start = courseManager.getSemesterStart();
    if (start) {
      const week = courseManager.calculateCurrentWeek(start);
      this.changeWeek(week);
    } else {
      wx.showToast({ title: '请先设置学期起始日期', icon: 'none' });
    }
  },

  // ==================== 课程详情弹窗 ====================
  onCourseTap(e) {
    const { day, section, cindex } = e.currentTarget.dataset;
    const cell = this.data.scheduleGrid[section][day];
    if (cell && cell.courses && cell.courses[cindex]) {
      this.setData({
        showDetail: true,
        detailCourse: cell.courses[cindex]
      });
    }
  },

  closeDetail() {
    this.setData({ showDetail: false, detailCourse: null });
  },

  editCourse() {
    const course = this.data.detailCourse;
    this.closeDetail();
    wx.navigateTo({
      url: `/pages/edit/edit?id=${course.id}`
    });
  },

  deleteCourse() {
    const course = this.data.detailCourse;
    wx.showModal({
      title: '确认删除',
      content: `确定要删除「${course.name}」吗？`,
      success: (res) => {
        if (res.confirm) {
          courseManager.deleteCourse(course.id);
          this.closeDetail();
          this.loadData();
          wx.showToast({ title: '已删除', icon: 'success' });
        }
      }
    });
  },

  // 清除所有课程
  clearAllCourses() {
    const count = courseManager.getCourses().length;
    if (count === 0) {
      wx.showToast({ title: '暂无课程数据', icon: 'none' });
      return;
    }
    wx.showModal({
      title: '清除全部课程',
      content: `当前共 ${count} 门课程，确定要全部清除吗？此操作不可恢复！`,
      confirmText: '确定清除',
      confirmColor: '#e74c3c',
      success: (res) => {
        if (res.confirm) {
          courseManager.clearAllCourses();
          this.loadData();
          wx.showToast({ title: '已清除全部课程', icon: 'success' });
        }
      }
    });
  },

  // ==================== 导航 ====================
  goToAdd() {
    wx.navigateTo({
      url: '/pages/edit/edit'
    });
  },

  // ==================== 导入课表 ====================

  // 导入Excel文件（.xls / .xlsx）
  importExcelFile() {
    wx.chooseMessageFile({
      count: 1,
      type: 'file',
      extension: ['xls', 'xlsx'],
      success: (res) => {
        const filePath = res.tempFiles[0].path;
        wx.showLoading({ title: '正在解析Excel...' });

        const fs = wx.getFileSystemManager();
        try {
          const buffer = fs.readFileSync(filePath);
          const result = xlsxParser.parseExcelFile(buffer);

          if (result.error) {
            wx.hideLoading();
            wx.showModal({
              title: '解析失败',
              content: result.error,
              showCancel: false,
              confirmText: '知道了'
            });
            return;
          }

          const count = courseManager.importFromXlsxGrid(result.rows);

          wx.hideLoading();
          this.loadData();

          if (count > 0) {
            wx.showModal({
              title: '导入成功',
              content: `成功导入 ${count} 门课程！`,
              showCancel: false
            });
          } else {
            wx.showModal({
              title: '提示',
              content: '未能识别到课程数据。\n\n请确认文件为教务处课表格式（含星期表头和大节信息）。',
              showCancel: false,
              confirmText: '知道了'
            });
          }
        } catch (e) {
          wx.hideLoading();
          wx.showModal({
            title: '读取失败',
            content: '文件读取异常: ' + (e.message || ''),
            showCancel: false,
            confirmText: '知道了'
          });
        }
      }
    });
  },

  // ==================== 学期设置 ====================
  showSemesterSetting() {
    const start = courseManager.getSemesterStart();
    this.setData({ semesterStart: start, showSemesterSetting: true });
  },

  onSemesterDateChange(e) {
    this.setData({ semesterStart: e.detail.value });
  },

  saveSemester() {
    const date = this.data.semesterStart;
    if (!date) {
      wx.showToast({ title: '请选择日期', icon: 'none' });
      return;
    }
    courseManager.setSemesterStart(date);

    const week = courseManager.calculateCurrentWeek(date);
    courseManager.setCurrentWeek(week);
    this.setData({ showSemesterSetting: false });
    this.loadData();
    wx.showToast({ title: '已设置，当前第' + week + '周', icon: 'success' });
  },

  closeSemesterSetting() {
    this.setData({ showSemesterSetting: false });
  },

  preventTouchMove() {
    return false;
  },

  onShareAppMessage() {
    return {
      title: `第${this.data.currentWeek}周课表`,
      path: '/pages/index/index'
    };
  }
});
