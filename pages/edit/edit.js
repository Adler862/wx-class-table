// pages/edit/edit.js - 添加/编辑课程页
const courseManager = require('../../utils/courseManager');

Page({
  data: {
    isEdit: false,
    editId: '',
    title: '添加课程',

    // 表单数据
    form: {
      name: '',
      teacher: '',
      location: '',
      day: 1,
      startPeriod: 1,
      endPeriod: 2,
      startWeek: 1,
      totalWeeks: 16,
      weekType: 'all',    // 'all' | 'odd' | 'even'
      weeks: '',          // 手动输入周数
      note: ''            // 备注
    },

    // 选择器数据
    dayArray: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
    dayIndex: 0,

    // 节次选择器（大节映射）
    sectionArray: [
      '第一大节 (01,02节 08:30-10:10)',
      '第二大节 (03,04节 10:30-12:10)',
      '第三大节 (05,06节 14:30-16:10)',
      '第四大节 (07,08节 16:30-18:10)',
      '第五大节 (09,10节 19:30-21:10)',
      '第六大节 (11,12节 21:20-23:00)'
    ],
    // 每大节对应的小节范围
    sectionPeriods: [
      { start: 1, end: 2 },  { start: 3, end: 4 },
      { start: 5, end: 6 },  { start: 7, end: 8 },
      { start: 9, end: 10 }, { start: 11, end: 12 }
    ],
    sectionIndex: 0,

    weekTypeArray: ['每周', '单周', '双周'],
    weekTypeIndex: 0
  },

  onLoad(options) {
    if (options.id) {
      const course = courseManager.getCourseById(options.id);
      if (course) {
        const weekTypeMap = { 'all': 0, 'odd': 1, 'even': 2 };
        const weeksStr = course.weeks && course.weeks.length > 0
          ? course.weeks.join(',') : '';

        // 根据小节号计算所属大节
        const sectionIdx = Math.floor(((course.startPeriod || 1) - 1) / 2);

        this.setData({
          isEdit: true,
          editId: course.id,
          title: '编辑课程',
          form: {
            name: course.name || '',
            teacher: course.teacher || '',
            location: course.location || '',
            day: course.day || 1,
            startPeriod: course.startPeriod || 1,
            endPeriod: course.endPeriod || 2,
            startWeek: course.startWeek || 1,
            totalWeeks: course.totalWeeks || 16,
            weekType: course.weekType || 'all',
            weeks: weeksStr,
            note: course.note || ''
          },
          dayIndex: (course.day || 1) - 1,
          sectionIndex: Math.max(0, Math.min(5, sectionIdx)),
          weekTypeIndex: weekTypeMap[course.weekType] || 0
        });

        wx.setNavigationBarTitle({ title: '编辑课程' });
      }
    }
  },

  // ==================== 表单输入 ====================
  onNameInput(e) { this.setData({ 'form.name': e.detail.value }); },
  onTeacherInput(e) { this.setData({ 'form.teacher': e.detail.value }); },
  onLocationInput(e) { this.setData({ 'form.location': e.detail.value }); },
  onWeeksInput(e) { this.setData({ 'form.weeks': e.detail.value }); },
  onNoteInput(e) { this.setData({ 'form.note': e.detail.value }); },

  onStartWeekInput(e) {
    let val = parseInt(e.detail.value) || 1;
    val = Math.max(1, Math.min(20, val));
    this.setData({ 'form.startWeek': val });
  },

  onTotalWeeksInput(e) {
    let val = parseInt(e.detail.value) || 1;
    val = Math.max(1, Math.min(20, val));
    this.setData({ 'form.totalWeeks': val });
  },

  // ==================== 选择器变更 ====================
  onDayChange(e) {
    const idx = parseInt(e.detail.value);
    this.setData({ dayIndex: idx, 'form.day': idx + 1 });
  },

  // 大节选择器变更
  onSectionChange(e) {
    const idx = parseInt(e.detail.value);
    const sp = this.data.sectionPeriods[idx];
    this.setData({
      sectionIndex: idx,
      'form.startPeriod': sp.start,
      'form.endPeriod': sp.end
    });
  },

  onWeekTypeChange(e) {
    const idx = parseInt(e.detail.value);
    const types = ['all', 'odd', 'even'];
    this.setData({ weekTypeIndex: idx, 'form.weekType': types[idx] });
  },

  // ==================== 提交 ====================
  onSubmit() {
    const { form, isEdit, editId } = this.data;

    if (!form.name.trim()) {
      wx.showToast({ title: '请输入课程名称', icon: 'none' });
      return;
    }

    // 解析手动输入的周数
    let weeksArray = [];
    if (form.weeks.trim()) {
      weeksArray = courseManager.parseWeeksInput(form.weeks);
      if (weeksArray.length === 0) {
        wx.showToast({ title: '周数格式不正确，请检查', icon: 'none' });
        return;
      }
    }

    const courseData = {
      name: form.name.trim(),
      teacher: form.teacher.trim(),
      location: form.location.trim(),
      day: form.day,
      startPeriod: form.startPeriod,
      endPeriod: form.endPeriod,
      startWeek: form.startWeek,
      totalWeeks: form.totalWeeks,
      weekType: form.weekType,
      weeks: weeksArray,
      note: form.note.trim()
    };

    if (isEdit) {
      courseManager.updateCourse(editId, courseData);
      wx.showToast({ title: '修改成功', icon: 'success' });
    } else {
      courseManager.addCourse(courseData);
      wx.showToast({ title: '添加成功', icon: 'success' });
    }

    setTimeout(() => { wx.navigateBack(); }, 1200);
  },

  // ==================== 预览 ====================
  onPreview() {
    const { form } = this.data;
    let weeksArray = [];
    if (form.weeks.trim()) {
      weeksArray = courseManager.parseWeeksInput(form.weeks);
    }

    const dayMap = ['一', '二', '三', '四', '五', '六', '日'];
    const weekTypeMap = { 'all': '每周', 'odd': '仅单周', 'even': '仅双周' };

    let weekInfo = '';
    if (weeksArray.length > 0) {
      weekInfo = `第${weeksArray.join(',')}周`;
    } else {
      weekInfo = `第${form.startWeek}-${form.startWeek + form.totalWeeks - 1}周 ${weekTypeMap[form.weekType]}`;
    }

    const lines = [
      `📖 ${form.name || '(未填写)'}`,
      form.note ? `📝 ${form.note}` : '',
      `👨‍🏫 ${form.teacher || '(未填写)'}`,
      `📍 ${form.location || '(未填写)'}`,
      `📅 周${dayMap[form.day - 1]} 第${form.startPeriod}-${form.endPeriod}节`,
      `📆 ${weekInfo}`
    ].filter(Boolean);

    wx.showModal({
      title: '课程预览',
      content: lines.join('\n'),
      showCancel: false,
      confirmText: '好的'
    });
  },

  // ==================== 快速填充示例 ====================
  onQuickDemo() {
    this.setData({
      form: {
        name: '高等数学', teacher: '张教授', location: '教学楼 A101',
        day: 1, startPeriod: 1, endPeriod: 2,
        startWeek: 1, totalWeeks: 16, weekType: 'all',
        weeks: '', note: ''
      },
      dayIndex: 0, sectionIndex: 0, weekTypeIndex: 0
    });
    wx.showToast({ title: '已填充示例数据', icon: 'none' });
  }
});
