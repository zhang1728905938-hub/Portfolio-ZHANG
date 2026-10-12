# Rui Zhang Portfolio

React + Vite 建筑师作品集。首页视频与作品共用一张纵向长页面，使用浏览器原生连续滚动，两者之间没有整屏翻页或停顿。向下进入 Contact 时通过照片归档动画落位，向上返回则使用连续滚动。默认白色画布，支持黑色主题、磨砂玻璃导航及手机浏览。

右上角的月亮／太阳按钮切换白色与黑色主题，各内容区域、导航、页脚及作品详情同步适配。浏览器会记住选择，刷新后保留；摄影素材保留原色。

## 启动

当前目录已经安装依赖。Windows 可双击 `start-preview.cmd`，随后打开 http://localhost:5173 。启动入口会先检查现有服务，已运行时直接复用；需要启动时会在后台运行预览，关闭启动窗口不会停止网站。日志保存在 `.preview/`。电脑重启后需再次双击启动入口。

在安装了 Node.js 20.19+ 或 22.12+ 的电脑上，也可以运行：

```bash
npm install
npm run dev
```

生产构建与预览：

```bash
npm run build
npm run preview
```

`dist/` 是生成的静态网站，可部署到任何支持静态文件的主机。通过 `npm run dev` 或 `npm run preview` 手动启动时，需要保持对应终端打开；双击 `start-preview.cmd` 使用后台启动方式。

## 连续滚动与导航

1. **About**：首页仅展示七个背景视频，不再叠加肖像、简历文字或信息卡。视频左右边界使用与顶部导航、其他页面内容相同的 `--content-width`，两侧留白随白色／黑色主题变化。视频位于导航栏下方，桌面按原始 16:9 比例完整显示；手机竖屏采用 4:5 居中取景，等比裁切而不拉伸，并取消首页的整屏最小高度以减少上下留白。视频不添加滤镜、色彩遮罩或渐变。首页视频、Works 全部缩略图和导航栏共用 11px 圆角。视频按提供顺序静音播放并循环，以双图层淡入衔接；页面离屏、切换后台或打开作品详情时暂停，支持手动暂停与继续，系统减少动态效果时先显示静态海报。
2. **Works**：WORK PROJECT（4）、ACADEMIC PROJECT（6）、AIGC & MODELLING（4）、OTHER WORKS（4），共 18 个作品，四组纵向排列。桌面左侧为标题、右侧为三列 4:3 图片；顶部分类导航平滑滚动到对应分组，底部 Works 导航回到 WORK PROJECT。点击照片打开原有作品详情。
3. **Contact**：独立页面展示 56 张 16:9 图片组成的三维圆环，保持约 27° 俯视角和每秒 4.158° 顺时针自动旋转。进入此页并完成归档后才运行动画，离开或打开作品详情时暂停。悬停或键盘聚焦时图片转正放大，移出后继续旋转，鼠标移动不控制转速。圆环下方居中显示 CONTACT、TEL：18773772732、EMAIL：zhang1728905938@163.com。标题、图标、主题与详情交互沿用已有设计。

About 与 Works 内的滚轮、触屏、方向键及 PageUp/PageDown 由浏览器原生处理，可以不中断地跨过首页视频和作品区域。浏览到作品底部后，再向下进入 Contact；18 个作品及其视觉副本组成 56 张照片，在约 1 秒内逐一汇聚到圆环对应位置。该正向过渡固定在当前视口内，落位后圆环恢复自动旋转，Contact 保持同样的屏幕位置并无缝接入文档流。随后向上浏览时，Contact、Works 与 About 连续滚动，没有回程切页、滚轮冷却或内部滚动区；短屏幕也由文档统一滚动。只有回滚到第一页最顶部，才会重新允许下一次向下进入 Contact 时播放归档动画；未到达该位置时，即使在首页中部、作品区与 Contact 之间反复往返，也始终保持连续浏览。每次播放后都会重新等待这个条件。顶部分类及 About / Works 导航仍定位到长页面对应位置。系统启用“减少动态效果”时跳过归档动画、导航立即定位，圆环停止自动旋转。

## 替换个人资料

编辑 `src/portfolio.js` 顶部的 `profile`：

```js
email: 'your-real-email@example.com',
phone: '+86 你的真实号码',
experience: '工作单位、职位、起止时间和项目职责',
education: '学校、学位、专业和毕业年份',
```

首页组件和排版分别在 `src/AboutPage.jsx`、`src/resume.css`。背景轮播位于 `src/AboutVideoBackground.jsx`，按 VIDEO 文件夹的数字文件名顺序读取 01、02、03、05、06、07、08 共七段视频，对应 `public/videos/about-01.mp4`、`about-02.mp4`、`about-03.mp4`、`about-05.mp4`、`about-06.mp4`、`about-07.mp4`、`about-08.mp4`。网页视频为原始文件的逐字节副本，保留各自的原始分辨率、帧率、色彩及音轨，页面通过 muted 静音播放，总计约 200.12 MB；首段未变，继续沿用 `about-poster.jpg`。

旧版履历数据 `src/resumeData.js` 和肖像参考素材 `public/images/rui-zhang-profile-layout.jpg` 保留供以后使用，当前首页不读取或展示它们。

联系区域的邮箱和电话仍读取 `src/portfolio.js`，显示于圆环下方的联系方式区；未填写时只显示 TEL / EMAIL 标签与图标。

## 替换作品与图片

- 所有项目集中在 `src/portfolio.js` 的 `projects` 数组；分类图片和计数自动更新。联系区圆环使用全部项目，循环填充 56 个展示位，各展示位有独立 ID。
- 当前标题、年份、描述是演示内容，摄影不是 Rui Zhang 的实际作品。替换后将项目的 `sample` 设为 `false`，即可移除详情中的占位说明。
- 大图位于 `public/images/`，小图为同名 `-sm.webp`。例如 `sculpted-light.jpg` 和 `sculpted-light-sm.webp`。
- 建议大图宽度 1400–2000px，小图宽度约 480px；保留文件名直接覆盖，或在项目配置中改成新的英文文件名。
- 如果原始素材使用中文文件名，先**复制**到 `public/images/`，将副本重命名为 `project-name.jpg` 等英文路径，不必改动原始文件。
- 替换大图后，安装 Pillow 并运行 `python scripts/prepare-images.py`，即可重新生成全部小图。网站正常运行不需要 Python。
- `position` 可设置图片裁切焦点，例如 `'center'`、`'70% center'`。

## 资源与设计参考

- 建筑照片占位来自 Unsplash。确切原始地址列在 `scripts/download-images.ps1`，下载后全部在本地运行。[Unsplash 图片许可](https://unsplash.com/license)。
- 字体为 Google Fonts 的 DM Sans 与 Manrope，本地存放于 `public/fonts/`；对应 SIL Open Font License 已随项目保存。全站采用无衬线正体，正文使用黑白灰。
- 图标来自 Lucide。
- 设计参考 [BIG Architecture](https://big.dk/projects/architecture) 的建筑摄影优先与项目分类方式；本站布局和交互为独立实现。

## 文件结构

```text
src/App.jsx              视频首页与作品长页面、独立联系页及作品详情
src/AboutPage.jsx        仅保留背景视频的首页
src/AboutVideoBackground.jsx 首页背景视频的顺序轮播与播放控制
src/aboutVideo.css       背景视频淡入与暂停控件
src/resumeData.js        旧版履历数据，当前首页未使用
src/resume.css           首页视频边界、留白与响应式布局
src/WorksPage.jsx        纵向作品分类和图片网格
src/useHybridNavigation.js 正向归档、回程原生滚动与无跳动衔接
src/returnScrollIntent.js 回到文档顶部后的正向归档重播判断
src/continuous.css       首页作品长页面、独立联系页与响应式布局
src/ArchiveTransition.jsx 56 张照片一秒汇聚圆环的动画图层
src/archiveTransition.js 归档项目对应与位置测量
src/archiveTransition.css 固定在视口内的归档图层样式
src/works.css            作品索引和响应式缩略图样式
src/layout.css           作品、联系区与顶部导航的统一边界
src/theme.css            黑白主题、深色玻璃与文字配色
src/useTheme.js          主题切换与浏览器偏好保存
src/pageNavigation.js    独立页面边界的手势和惯性保护
src/styles.css           桌面与手机视觉样式
src/header.css           悬浮玻璃导航与手机折叠菜单样式
src/orbit.css            三维图片环、远近层次与转正动画
src/ringGeometry.js      圆环几何与响应式投影边界
src/ringMotion.js        自动旋转、停留查看与暂停状态
src/useSpatialRing.js    图片环旋转和暂停控制
src/portfolio.js         个人资料、分类、项目配置
public/images/           本地建筑摄影与缩略图
public/videos/           首页七个静音视频与静态海报
public/fonts/            本地字体与许可证
scripts/                 图片和字体准备脚本
start-preview.cmd        Windows 启动入口
```
