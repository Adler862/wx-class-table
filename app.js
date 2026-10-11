App({
  globalData: {
    // 当前查看的周次
    currentWeek: 1,
    // 学期起始日期（用于计算当前是第几周）
    semesterStart: null,
    // 课程数据缓存
    courses: []
  },

  onLaunch() {
    // 从本地存储加载数据
    const currentWeek = wx.getStorageSync('currentWeek');
    if (currentWeek) {
      this.globalData.currentWeek = currentWeek;
    }
    const semesterStart = wx.getStorageSync('semesterStart');
    if (semesterStart) {
      this.globalData.semesterStart = semesterStart;
    }
    const courses = wx.getStorageSync('courses');
    if (courses) {
      this.globalData.courses = courses;
    }
  }
});
