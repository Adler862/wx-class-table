# WXClassTable · 课表小程序

一个微信小程序课表工具：把教务系统的课表变成手机上随时能看的周课表。

> 这是一个**课程实训项目**（小组作业，本人负责前端开发）。代码由我完成，实现过程使用了 AI 编码助手。

## 功能

- **周课表网格**：6 大节 × 7 天，课程块按课程名自动配色
- **周次切换**：上一周 / 下一周 / 直接输入周次 / 一键回到本周，顶部显示本周日期
- **单双周课程**：按单周 / 双周 / 每周区分显示
- **学期设置**：设置学期起始日，自动推算当前是第几周
- **两种导入方式**
  1. 应用内导入：直接把教务系统导出的 `.xls/.xlsx` 丢进来（`utils/xlsxParser.js` 解析）
  2. 脚本转换：用 `tools/convert_xls.py` 先把表格转成 JSON，再导入
- **本地持久化**：课程与设置存在 `wx.setStorageSync`，不依赖后端（本项目没有服务端）

## 目录结构

```
app.js / app.json / app.wxss     小程序入口与全局样式
pages/index/                     课表主页（网格渲染、周次切换、导入入口）
pages/edit/                      课程增删改
utils/courseManager.js           课程数据管理（增删改查、单双周判定、周次计算）
utils/util.js                    作息时间与日期工具
utils/xlsxParser.js              Excel 解析封装
tools/convert_xls.py             教务系统 .xls/.xlsx → JSON（GBK 编码处理、伪 .xlsx 兜底）
```

## 快速开始

1. 用**微信开发者工具**导入本目录（`appid` 已置为 `touristappid`，即测试号模式；
   有自己的 appid 就改 `project.config.json`）。
2. 放好 Excel 解析库：仓库**不包含** `utils/xlsx.full.min.js`（SheetJS 是第三方库，请自行获取），
   下载后放到 `utils/` 下即可：
   ```bash
   npm i xlsx && cp node_modules/xlsx/dist/xlsx.full.min.js utils/
   ```
3. 准备课表数据，二选一：
   - 应用内导入：在小程序里点「导入课表」，选择教务系统导出的表格；
   - 脚本转换：`python tools/convert_xls.py 学生个人课表.xls`，得到 `schedule_data.json`。

## 课表 JSON 格式

`tools/convert_xls.py` 输出、以及应用内导入后存储的结构：

```json
{
  "meta": { "student": "示例大学  学生个人课表", "semesterStart": "2026-09-07" },
  "courses": [
    {
      "name": "数据结构", "teacher": "张老师", "location": "教学楼 A101",
      "day": 1, "startPeriod": 1, "endPeriod": 2,
      "startWeek": 1, "totalWeeks": 20, "weekType": "all",
      "weeks": [2, 3, 4], "note": ""
    }
  ]
}
```

- `day`：1=周一 … 7=周日；`startPeriod` / `endPeriod`：第几大节（1–6）
- `weekType`：`all` / `odd`（单周）/ `even`（双周）；`weeks` 为实际生效周次

## 关于 Excel 解析

`tools/convert_xls.py` 用 `xlrd` 读 `.xls`（教务系统导出的是 GBK 编码，需要
`encoding_override='gbk'`），并对"扩展名是 `.xlsx` 但内容仍是旧格式"的情况做了兜底：
先试 `xlrd`，失败再试 `openpyxl`。

## License

MIT，见 [LICENSE](LICENSE)。
