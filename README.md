# GPT 真人原声独立版 · 2026 全国Ⅰ卷第 10 题

本地 `remotion` 分支从 `ab27cf0` 独立搭建，使用同一真人母带。原题、3D 坐标与数学函数复用，画面采用 Three.js 正交投影的 SVG 图形、KaTeX 板书和 **LXGW WenKai（霞鹜文楷）字幕**。动画只由帧号决定，随机定位不依赖前一帧。

- `npm ci`，然后 `npm run typecheck` / `npm test`。
- `npm run gpt:subtitles` 从人工整理的 `audio/gpt_voice_subtitles.json` 生成 SRT。
- `npm run gpt:stills` 检查关键帧；`npm run gpt:samples` 出三段短片；`npm run gpt:render` 出 1080p60 全片。
- 需要 `ffmpeg` 和 `ffprobe`。`GPT_VOICE_SOURCE` 可覆盖默认的相邻源仓库母带路径，`GPT_VOICE_TEMP` 可指定渲染临时目录，`GPT_VOICE_CHROME` 可指向已有 Chrome Headless Shell（可选），`GPT_VOICE_CONCURRENCY` 可调并发（默认 7）。Windows 本机用 `D:/temp/codex/gpt-make-2026_national_1_q10_dihedral_tracks` 作为临时目录。
- 全片默认输出到 `video/archive/`。母带 AAC 音轨通过 stream copy 封装，渲染脚本检查视频帧数及 AAC 数据哈希，不覆盖现有成片。这里不配置远程或发布流程。

---

## 原工程：空间双轨道

> 网页互动与 OBS 录屏用 Three.js 动画。已配备开源 Whisper 自动提取与高颜值霞鹜文楷中文字幕。
> 
> 🌐 **在线交互演示 (GitHub Pages)**：<https://somevincentzyumaths.github.io/2026_national_1_q10_dihedral_tracks/>

![网页交互与双轨道空间三维可视化界面](preview/web-ui-overview.jpg)

## 题目与答案

- 题源：2026 年全国 I 卷第 10 题
- 正确答案：BC
- 核心结论：\(CD\) 的最小值为 \(\sqrt3\)；当 \(AB\perp CD\) 时，可推出 \(CD\perp\) 平面 \(ABD\)
- 建系：以 A 为原点，\(AB\) 所在直线为 \(y\) 轴（从 A 指向 B），\(z\) 轴竖直向上，\(x\) 轴按图示垂直于 \(AB\)

## 在线体验与本地启动

- 🚀 **免安装在线即玩 (GitHub Pages)**：<https://somevincentzyumaths.github.io/2026_national_1_q10_dihedral_tracks/>
- 💻 **本地开发启动**：

```powershell
npm install
npm run dev
```

默认本地地址：<http://127.0.0.1:62026/>

## 交互与录屏

控制方式与另外两个项目一致：`Space` 播放，方向键切换步骤，`T` 切换主题，`V` 切换画幅，`M` 切换讲解/自由视角，`Home` 或双击复位镜头，`C` 进入录屏模式。两种视角都支持左键旋转、右键平移、滚轮缩放。

在线录屏快捷链接：
- **横屏录制**：[16:9 深色讲解](https://somevincentzyumaths.github.io/2026_national_1_q10_dihedral_tracks/?mode=capture&theme=dark&ratio=16x9)
- **竖屏录制**：[9:16 短视频模式](https://somevincentzyumaths.github.io/2026_national_1_q10_dihedral_tracks/?mode=capture&theme=dark&ratio=9x16)

本地录屏：
横屏：

```text
http://127.0.0.1:62026/?mode=capture&theme=dark&ratio=16x9
```

竖屏：

```text
http://127.0.0.1:62026/?mode=capture&theme=dark&ratio=9x16
```

可附加 `&step=3`、`&captions=0`、`&autoplay=1`。

附加 `&camera=free` 可让步骤切换不再自动转动相机，适合边讲边自由观察。

全片 10 幕，共 2 分 02 秒：`00` 原题、`01` 建系、`02–03` B（投影与取等）、`04–06` C（向量分量、截面直角、线面判定）、`07` A 的 45° 反例、`08` D 的点积反例、`09` 四项回看。

## 文件

- `src/scenes/scene.ts`：两条圆轨道及圆心 O₁、O₂ 标注、动点、平面 ABD 和二维俯视插图
- `src/scenes/dihedralMath.ts`：点坐标、径向距离与最小距离
- `src/main.ts`：十幕脚本、分段字幕与公式；`src/scenes/proofDrawing.ts`：投影、角弧和直角等证明辅助图形
- `content/`：题面、分镜和人工配音提示

## 验收

```powershell
npm run typecheck
npm test
npm run build
```
