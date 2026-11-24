import {TRACKS} from '../scenes/dihedralMath';
import voiceCues from '../../audio/gpt_voice_subtitles.json';
import edit from './gptEdit.json';

export const FPS = edit.fps;
export const MASTER_FRAMES = Math.ceil(edit.masterSamples * FPS / edit.sampleRate);
export const CUT_FRAMES = edit.cutToFrame - edit.cutFromFrame;
export const AUDIO_SAMPLES = edit.masterSamples - CUT_FRAMES * (edit.sampleRate / FPS);
export const FRAMES = MASTER_FRAMES - CUT_FRAMES;
export const sourceFrameAt = (frame: number) => frame + (frame < edit.cutFromFrame ? 0 : CUT_FRAMES);
export const playbackTimeAt = (sourceTime: number) => Math.max(0, sourceTime - Math.max(0, Math.min(sourceTime - edit.cutFromFrame / FPS, CUT_FRAMES / FPS)));
export const chapters = [
  {at: 0, key: 'intro', tag: '题设', label: '题意与建系'},
  {at: 64, key: 'B', tag: 'B', label: '距离下界'},
  {at: 284.3, key: 'C', tag: 'C', label: '线面垂直'},
  {at: 465, key: 'A', tag: 'A', label: '角度反例'},
  {at: 522.3, key: 'D', tag: 'D', label: '垂直反例'},
  {at: 570.44, key: 'end', tag: '结论', label: '回顾'},
] as const;

export const CHAPTER_GAP = 14;
export const CHAPTER_MIN = 104;
export const CHAPTER_SPAN = 1920 - 2 * 72;
export function chapterWidths() {
  const durations = chapters.map(({at}, i) => (chapters[i + 1] ? playbackTimeAt(chapters[i + 1].at) : FRAMES / FPS) - playbackTimeAt(at));
  const widths = durations.map(() => 0);
  let remaining = CHAPTER_SPAN - CHAPTER_GAP * (chapters.length - 1);
  let pool = durations.map((_, i) => i);
  while (pool.length) {
    const total = pool.reduce((sum, i) => sum + durations[i], 0);
    const tooNarrow = pool.filter(i => remaining * durations[i] / total < CHAPTER_MIN);
    if (!tooNarrow.length) {
      for (const i of pool) widths[i] = remaining * durations[i] / total;
      break;
    }
    for (const i of tooNarrow) { widths[i] = CHAPTER_MIN; remaining -= CHAPTER_MIN; }
    pool = pool.filter(i => !tooNarrow.includes(i));
  }
  return widths;
}

export const proofTimes = {
  componentAB: 325.52, componentCD: 335.52, dotC: 346.78, zeroC: 357.78,
  planeD: 550.18, vectorAC: 562.82, vectorAD: 564, angleD: 565.54, dotD: 567.04,
} as const;

const mix = (a: number, b: number, q: number) => a + (b - a) * q;
export const ease = (t: number, a: number, b: number) => {
  const x = Math.max(0, Math.min(1, (t - a) / (b - a)));
  return x * x * (3 - 2 * x);
};

// The final sentence about the two cylinders ends at 27.62 s on the voice track.
export const openingCylinders = (t: number) => {
  const hold = 1 - ease(t, 34.62, 35.92);
  return {outer: ease(t, 18.1, 19.25) * hold, inner: ease(t, 23.45, 24.6) * hold};
};

export const closingReviewAt = (t: number) => ease(t, 570.44, 573.42);
export const closingCylinders = (t: number) => ({outer: ease(t, 571.2, 573.02), inner: ease(t, 571.6, 573.42)});
export const sectionDemo = [206.86, 225] as const;
const sectionKeyframes = [
  [208.10, TRACKS.axialC, TRACKS.axialDStart], [211.36, TRACKS.axialC, 2.10],
  [213.44, 4.22, 2.72], [216.54, 5.36, 1.40], [219.36, 4.43, 2.39],
  [223.12, 4.43, 2.39], [225, TRACKS.axialC, TRACKS.axialDStart],
] as const;

export function sectionPositions(t: number) {
  const i = sectionKeyframes.findIndex(([at]) => t < at);
  if (i <= 0) return {c: TRACKS.axialC, d: TRACKS.axialDStart};
  const [first, c0, d0] = sectionKeyframes[i - 1];
  const [last, c1, d1] = sectionKeyframes[i];
  const q = ease(t, first, last);
  return {c: mix(c0,c1,q), d: mix(d0,d1,q)};
}

export type BoardRow = {at: number; text: string; tex: string; anchor?: 'O' | 'D' | 'Dprime' | 'C' | 'A'; id?: 'decomp' | 'components' | 'dotC' | 'zeroC' | 'vectorsD' | 'angleD' | 'dotD'};
type Beat = {at: number; kicker: string; title: string; note: string; rows: BoardRow[]};
export const beats: Beat[] = [
  {at: 0, kicker: '题目条件', title: '两条同轴轨道', note: 'A、B 是定点；C、D 是动点。固定的是它们到轴的距离，以及两个半平面的夹角。', rows: [
    {at: 6, text: '外轨 · 点 C', tex: 'd(C,AB)=2', anchor: 'C'},
    {at: 10, text: '内轨 · 点 D', tex: 'd(D,AB)=1', anchor: 'D'},
  ]},
  {at: 25, kicker: '选坐标系', title: '垂足都在同一根轴上', note: 'A 是原点，AB 是 y 轴；沿轴平移半径，不会改变它的方向。', rows: [
    {at: 29, text: 'C 的垂足', tex: 'O_1C=2', anchor: 'C'},
    {at: 36, text: 'D 的垂足', tex: 'O_2D=1', anchor: 'D'},
    {at: 44, text: '过 C 的横截面', tex: String.raw`\angle CO_1D^{\prime}=60^\circ`, anchor: 'Dprime'},
  ]},
  {at: 64, kicker: 'B / 截面投影', title: '沿 AB 看过去', note: 'D 投到过 C 的截面，落在 D′。现在只看这一个三角形。', rows: [
    {at: 68, text: '两边及夹角', tex: String.raw`2,\;1,\;60^\circ`, anchor: 'O'},
    {at: 77, text: '余弦定理', tex: String.raw`CD^{\prime 2}=2^2+1^2-4\cos60^\circ`, anchor: 'Dprime'},
    {at: 85, text: '截面距离固定', tex: String.raw`CD^{\prime}=\sqrt3`, anchor: 'Dprime'},
  ]},
  {at: 103, kicker: 'B / 空间下界', title: '再把深度加回来', note: '轴向差只会增加空间距离。让 D 沿轴滑到 D′，就能取到下界。', rows: [
    {at: 111, text: '空间分解', tex: String.raw`\vec{CD}=\vec{CD^{\prime}}+\vec{D^{\prime}D}`, anchor: 'Dprime'},
    {at: 127, text: '直角在 D′', tex: 'CD^2=3+(y_D-y_C)^2', anchor: 'Dprime'},
    {at: 151, text: '轴向差归零时取等', tex: String.raw`CD_{\min}=\sqrt3`, anchor: 'D'},
  ]},
  {at: 172, kicker: 'B / 两个分量', title: '一个固定，一个可变', note: '把同一个向量拆成截面方向和轴向；轴向的那一段不在截面里。', rows: [
    {at: 177, text: '截面内 · 只有 x、z 分量', tex: String.raw`|\vec{CD^{\prime}}|=\sqrt3`, anchor: 'Dprime'},
    {at: 188, text: '轴向 · 只有 y 分量', tex: String.raw`|\vec{D^{\prime}D}|=|y_D-y_C|`, anchor: 'D'},
  ]},
  {at: 224, kicker: 'B / 旋转对称', title: '一起转，夹角不变', note: '可以把 OC 取成 z 轴的正方向。这只是选坐标，不会额外限制图形。', rows: [
    {at: 227, text: '半径和相对方向都不变', tex: String.raw`2,\;1,\;60^\circ`, anchor: 'O'},
    {at: 256, text: '把 C 的径向选作 z 轴正向', tex: 'C=(0,y_C,2)', anchor: 'C'},
  ]},
  {at: 284.3, kicker: 'C / 正交条件', title: '点积只看轴向分量', note: 'AB 没有 x、z 分量。要让点积为零，CD 的 y 分量必须为零。', rows: [
    {at: 315.38, text: '截面内的分量 + 沿轴的分量', tex: String.raw`\vec{CD}=\vec{CD^{\prime}}+\vec{D^{\prime}D}`, anchor: 'Dprime', id: 'decomp'},
    {at: proofTimes.componentAB, text: '逐项写出空间分量', tex: String.raw`\vec{AB}=(0,y_B,0),\quad \vec{CD}=(\Delta x,y_D-y_C,\Delta z)`, anchor: 'O', id: 'components'},
    {at: proofTimes.dotC, text: '点积中只留下 y 分量', tex: String.raw`\vec{AB}\cdot\vec{CD}=y_B(y_D-y_C)`, anchor: 'D', id: 'dotC'},
    {at: proofTimes.zeroC, text: '要使点积为零，而 y_B ≠ 0', tex: String.raw`y_D-y_C=0\;\Rightarrow\;y_D=y_C`, anchor: 'O', id: 'zeroC'},
  ]},
  {at: 378, kicker: 'C / 共截面', title: '两只垂足合为 O', note: 'C、D 落在同一个垂直于 AB 的截面内。', rows: [
    {at: 388, text: 'D 沿轴进入 C 的截面', tex: 'O_1=O_2=O', anchor: 'O'},
    {at: 397, text: '轴垂直于该截面', tex: String.raw`AB\perp CD`, anchor: 'D'},
  ]},
  {at: 416, kicker: 'C / 勾股逆定理', title: '直角在 D 点', note: '现在没有轴向差，截面三角形的三边就是 1、√3、2。', rows: [
    {at: 419, text: '三边满足勾股关系', tex: String.raw`1^2+(\sqrt3)^2=2^2`, anchor: 'D'},
    {at: 431, text: '较长的一边 OC 是斜边', tex: String.raw`CD\perp OD`, anchor: 'D'},
  ]},
  {at: 439, kicker: 'C / 线面判定', title: '在同一平面内找两条线', note: 'AB 与 OD 在 O 相交，两条线都属于平面 ABD。', rows: [
    {at: 441, text: '两条相交线', tex: String.raw`AB\cap OD=\{O\}`, anchor: 'O'},
    {at: 448, text: 'CD 与它们都垂直', tex: String.raw`CD\perp AB,\quad CD\perp OD`, anchor: 'D'},
    {at: 460, text: '线面垂直的判定', tex: String.raw`CD\perp\text{平面 }ABD`, anchor: 'D'},
  ]},
  {at: 465, kicker: 'A / 取一个位置', title: '能不能小于 60°？', note: '保持 C、D 共截面，只改变这个截面到 A 的距离。', rows: [
    {at: 479, text: '沿 AB 平移公共截面', tex: String.raw`AO_1=AO=\sqrt2`, anchor: 'O'},
    {at: 488, text: '直角两边等长', tex: String.raw`AD=CD=\sqrt3`, anchor: 'D'},
    {at: 513, text: '等腰直角三角形 ACD', tex: String.raw`\angle CAD=45^\circ<60^\circ`, anchor: 'A'},
  ]},
  {at: 522.3, kicker: 'D / 取轴垂截面', title: '把截面移到 A', note: '先验证前提成立，再看选项声称的结论是否成立。', rows: [
    {at: proofTimes.planeD, text: '前提：A、C、D 都在 xOz 平面内', tex: String.raw`AB\perp\text{平面 }ACD`, anchor: 'A'},
    {at: proofTimes.vectorAC, text: '把两条边写成从 A 出发的向量', tex: String.raw`\vec{AC}=(0,0,2),\quad\vec{AD}=(\tfrac{\sqrt3}{2},0,\tfrac12)`, anchor: 'A', id: 'vectorsD'},
    {at: proofTimes.angleD, text: '两条半径的夹角不是直角', tex: String.raw`\angle CAD=60^\circ`, anchor: 'A', id: 'angleD'},
    {at: proofTimes.dotD, text: '点积不为零，所以 AC 不垂直于 AD', tex: String.raw`\vec{AC}\cdot\vec{AD}=0\cdot\tfrac{\sqrt3}{2}+0\cdot0+2\cdot\tfrac12=1\ne0`, anchor: 'A', id: 'dotD'},
  ]},
  {at: 570.44, kicker: '答案 / 2026 全国Ⅰ卷 · 第 10 题', title: '正确选项 B、C', note: 'B 求下界，C 判线面；A 与 D 各有一个满足题设的反例。', rows: []},
];

export const gptFrame = (t: number) => {
  let chapterIndex = 0;
  for (const [i, item] of chapters.entries()) if (item.at <= t) chapterIndex = i;
  const chapter = chapters[chapterIndex];
  let beat = beats[0];
  for (const item of beats) if (item.at <= t) beat = item;
  const section = sectionPositions(t);
  const review = closingReviewAt(t);
  const yC = mix(section.c, Math.sqrt(2), ease(t, 474, 479));
  const toA = ease(t, 525.7, 536);
  const moveB = ease(t, 145.8, 150.6);
  const reopen = ease(t, 173, 178);
  const moveC = ease(t, 378.72, 385.18);
  const yD = mix(section.d, TRACKS.axialC, moveB * (1 - reopen) + moveC);
  const axialC = mix(mix(yC, 0, toA), TRACKS.axialC, review);
  const axialD = t >= 465 ? mix(mix(yC, 0, toA), TRACKS.axialDStart, review) : yD;
  const angle = 0.89 * (ease(t, 239, 248) - ease(t, 249, 258)) - 0.55 * (ease(t, 259, 264) - ease(t, 265, 272));
  const endOn = (ease(t, 46, 49) - ease(t, 56, 60))
    + (ease(t, 64, 68) - ease(t, 105.88, 108.2))
    + (ease(t, 228, 231.7) - ease(t, 289.7, 293.3))
    + (ease(t, 416, 420) - ease(t, 435, 440));
  const dView = ease(t, 525.7, 532.3) * (1 - ease(t, 569, 572));
  const close = ease(t, 470, 478) * (1 - review);
  const board = ease(t, 308.46, 311) - ease(t, 375, 378);
  const merged = Math.abs(axialC - axialD) < 1e-8;
  const isAtA = axialC < 1e-8;
  const nextChapter = chapters[chapterIndex + 1];
  const playback = playbackTimeAt(t);
  const cue = voiceCues.find((item) => item.startMs !== edit.removedCaptionStartMs && item.startMs <= t * 1000 && t * 1000 < item.endMs);
  const start = playbackTimeAt(chapter.at);
  const end = nextChapter ? playbackTimeAt(nextChapter.at) : (FRAMES - 1) / FPS;
  return {
    t, playback, chapter, chapterIndex, beat, axialC, axialD, endOn, dView, close, board, angle, merged, isAtA, review,
    chapterProgress: Math.min(1, (playback - start) / (end - start)),
    caption: cue?.text ?? '', rows: beat.rows.filter((row) => row.at <= t),
  };
};
export type GptFrame = ReturnType<typeof gptFrame>;
