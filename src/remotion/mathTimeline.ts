import * as THREE from 'three';
import { TRACKS } from '../scenes/dihedralMath';

export interface SceneFrameData {
  timeMs: number;
  stepIndex: number;
  stepProgress: number;
  cameraPosition: THREE.Vector3;
  cameraTarget: THREE.Vector3;
  cameraZoom: number;
  axialC: number;
  axialD: number;
  insetOpacity: number;
  planeOpacity: number;
  highlight: number;
  showSectionLabel: boolean;
  sectionLabelText: string;
  isAtA: boolean;
  isMerged: boolean;
  stepTitle: string;
  stepLabel: string;
  currentCaption: string;
  currentFormula: string;
  currentOption: string | null;
}

const near = TRACKS.axialDStart; // 1.0
const far = TRACKS.axialC;      // 2.7

// 三大典型镜头定义
const obliqueView = {
  position: new THREE.Vector3(13.5, 6, 10.5),
  target: new THREE.Vector3(5, 0, 0),
  zoom: 1.0,
};

const endOnView = {
  position: new THREE.Vector3(15, 0.8, 0),
  target: new THREE.Vector3(far, 0.8, 0),
  zoom: 1.0,
};

const closeView = {
  position: new THREE.Vector3(8, 4, 8),
  target: new THREE.Vector3(2, 0.9, 0),
  zoom: 1.0,
};

export const easeInOut = (t: number) => {
  const x = THREE.MathUtils.clamp(t, 0, 1);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
};

export const ramp = (p: number, a: number, b: number) =>
  easeInOut(THREE.MathUtils.clamp((p - a) / (b - a), 0, 1));

// 10 幕时间轴定义（与 audio/audio_timeline.json 严格 1:1 对齐）
export const SCENE_DURATIONS_MS = [
  15216, // 00 原题
  22704, // 01 建系
  21120, // 02 B · 投影
  25392, // 03 B · 下界
  26184, // 04 C · 分量
  17472, // 05 C · 直角
  17952, // 06 C · 判定
  22536, // 07 A · 反例
  21456, // 08 D · 反例
  15312, // 09 总结回看
];

export const TOTAL_DURATION_MS = SCENE_DURATIONS_MS.reduce((a, b) => a + b, 0); // 205344 ms

export const SCENE_STARTS_MS: number[] = [];
let accumulated = 0;
for (const dur of SCENE_DURATIONS_MS) {
  SCENE_STARTS_MS.push(accumulated);
  accumulated += dur;
}

export const STEP_METADATA = [
  {
    index: 0,
    label: '原题',
    title: '先看原题',
    caption: '空间中 A、B 为定点，C、D 到直线 AB 的距离分别为 2 和 1。\n二面角 C-AB-D 为 60°，哪些结论一定成立？',
    formula: '',
    option: null,
  },
  {
    index: 1,
    label: '建系',
    title: '60° 究竟是哪两条线的夹角？',
    caption: '以 A 为原点，沿 AB 为 y 轴正向，z 轴竖直向上。C、D 在 y 轴上的垂足分别是 O₁、O₂。',
    formula: 'O_1C=2,\\quad O_2D=1',
    revealAt: 0.45,
    revealCaption: '把 O₂D 平移到 O₁D′，方向保持不变。金色角弧才是二面角的平面角。',
    revealFormula: 'O_1D\'\\parallel O_2D,\\quad \\angle CO_1D\'=60^\\circ',
    option: null,
  },
  {
    index: 2,
    label: 'B · 投影',
    title: '先求截面上的 CD′',
    caption: '沿 y 轴看，D 投到过 C、O₁ 的截面上，落点为 D′。',
    formula: 'O_1C=2,\\quad O_1D\'=1',
    revealAt: 0.40,
    revealCaption: '在三角形 CO₁D′ 中用余弦定理。求出的是投影 CD′ 的长度。',
    revealFormula: 'CD\'^2=2^2+1^2-2\\cdot2\\cdot1\\cos60^\\circ=3',
    option: 'B',
  },
  {
    index: 3,
    label: 'B · 下界',
    title: '把空间距离拆成两条直角边',
    caption: '回到斜视角：DD′ 垂直截面，直角在 D′。两段长度不能直接相加。',
    formula: 'DD\'=|y_D-y_C|,\\quad CD^2=CD\'^2+DD\'^2=3+(y_D-y_C)^2',
    revealAt: 0.48,
    revealCaption: '让 O₂ 滑到 O₁：轴向距离变为零，D 与 D′ 重合。下界可以取到，B 正确。',
    revealFormula: 'DD\'=O_1O_2=0\\implies CD_{\\min}=\\sqrt3',
    option: 'B',
  },
  {
    index: 4,
    label: 'C · 分量',
    title: '为什么 AB⊥CD 就能让两点共截面？',
    caption: 'AB 只有 y 分量。点积里，CD 的 x、z 分量都乘以零；是否垂直只看 y 分量。',
    formula: '\\vec{AB}\\cdot\\vec{CD}=y_B(y_D-y_C)',
    revealAt: 0.48,
    revealCaption: 'y_B 非零，所以 y_D=y_C。两个垂足合为 O，C、D、O 同在垂直于 y 轴的截面内。',
    revealFormula: 'AB\\perp CD\\iff y_D=y_C\\iff O_1=O_2=O',
    option: 'C',
  },
  {
    index: 5,
    label: 'C · 直角',
    title: '截面里还有哪两条线垂直？',
    caption: '只看截面三角形 OCD：三边分别是 1、√3 和 2。最长的 OC 对着 D 点。',
    formula: 'OD=1,\\quad CD=\\sqrt3,\\quad OC=2',
    revealAt: 0.45,
    revealCaption: '由勾股定理的逆定理，直角在 D 点。因此 CD 垂直于 OD。',
    revealFormula: 'OD^2+CD^2=1+3=OC^2\\implies CD\\perp OD',
    option: 'C',
  },
  {
    index: 6,
    label: 'C · 判定',
    title: '平面内找两条相交直线',
    caption: '显出平面 ABD。AB 和 OD 都在这个平面内，并且交于 O。',
    formula: 'AB\\cap OD=\\{O\\}',
    revealAt: 0.45,
    revealCaption: 'CD 垂直于 AB 是前提，垂直于 OD 是上一幕所得。由线面垂直判定，C 正确。',
    revealFormula: 'CD\\perp AB,\\quad CD\\perp OD\\implies CD\\perp\\text{平面 }ABD',
    option: 'C',
  },
  {
    index: 7,
    label: 'A · 反例',
    title: '同一个 60° 二面角，能否得到 45° 的 ∠CAD？',
    caption: '两圆心保持重合，把截面移到 AO=√2 处。取这个位置仍满足全部题设。',
    formula: 'AD^2=AO^2+OD^2=2+1=3',
    revealAt: 0.48,
    revealCaption: 'AD=CD=√3，而且 CD⊥AD。三角形 ADC 是等腰直角三角形，A 点的角只有 45°。',
    revealFormula: '\\angle CAD=45^\\circ<60^\\circ',
    option: 'A',
  },
  {
    index: 8,
    label: 'D · 反例',
    title: '把整个截面移到 A，前提成立了',
    caption: '继续平移，直至 O 与 A 重合。现在平面 ACD 就是垂直于 AB 的截面。',
    formula: 'O=A\\implies AB\\perp\\text{平面 }ACD',
    revealAt: 0.48,
    revealCaption: '此时 AC、AD 就是夹角 60° 的两条半径。点积等于 1，不是 0，所以 AC 不垂直于 AD。',
    revealFormula: '\\vec{AC}\\cdot\\vec{AD}=1\\ne0',
    option: 'D',
  },
  {
    index: 9,
    label: '回看',
    title: '四个选项，各留一条理由',
    caption: 'A：45° 反例；B：投影给出下界 √3；C：垂直于平面内两条相交直线；D：截面过 A 时夹角为 60°。',
    formula: '\\boxed{\\text{正确选项：B、C}}',
    revealAt: 0.50,
    revealCaption: '四个选项全部辨析完毕，正确选项为 B、C。',
    revealFormula: '\\boxed{\\text{正确选项：B、C}}',
    option: null,
  },
];

/**
 * 纯数学函数：根据毫秒时间戳计算当前帧的所有几何与相机状态
 */
export function computeFrameData(timeMs: number): SceneFrameData {
  const clampedTime = THREE.MathUtils.clamp(timeMs, 0, TOTAL_DURATION_MS);

  // 定位处于哪一幕
  let stepIndex = 0;
  for (let i = SCENE_STARTS_MS.length - 1; i >= 0; i--) {
    if (clampedTime >= SCENE_STARTS_MS[i]) {
      stepIndex = i;
      break;
    }
  }

  const stepStart = SCENE_STARTS_MS[stepIndex];
  const stepDuration = SCENE_DURATIONS_MS[stepIndex];
  const stepProgress = THREE.MathUtils.clamp((clampedTime - stepStart) / stepDuration, 0, 1);
  const meta = STEP_METADATA[stepIndex];

  // 1. 动点轴向位置 (axialC, axialD) 纯函数
  let axialC: number = far;
  let axialD: number = near;

  if (stepIndex === 3) {
    // 03 B·下界：“当 O2 滑动到与 O1 重合时” -> 在配音后半段 (0.45 ~ 0.75) 动点 D 丝滑滑动到 C
    axialD = THREE.MathUtils.lerp(near, far, ramp(stepProgress, 0.45, 0.75));
  } else if (stepIndex === 4) {
    // 04 C·分量：两垂足滑动演示
    axialD = far - (far - near) * (ramp(stepProgress, 0.05, 0.28) - ramp(stepProgress, 0.49, 0.77));
  } else if (stepIndex === 5 || stepIndex === 6) {
    // 05, 06 两圆心重合
    axialD = axialC = far;
  } else if (stepIndex === 7) {
    // 07 A·反例：截面平移到 AO = √2 (约 1.414)
    axialD = axialC = THREE.MathUtils.lerp(far, Math.SQRT2, ramp(stepProgress, 0.06, 0.47));
  } else if (stepIndex === 8) {
    // 08 D·反例：截面平移至原点 A (0)
    axialD = axialC = Math.SQRT2 * (1 - ramp(stepProgress, 0.06, 0.50));
  } else if (stepIndex === 9) {
    // 09 回看：优雅回到初始位置
    axialC = far * ramp(stepProgress, 0.05, 0.56);
    axialD = near * ramp(stepProgress, 0.05, 0.56);
  }

  // 2. 相机轨迹与视角的纯时间插值计算（重点！配合台词与字幕！）
  const cameraPos = new THREE.Vector3();
  const cameraTarget = new THREE.Vector3();
  let cameraZoom = 1.0;

  // 辅助函数：两个视角的插值
  const blendViews = (
    viewA: typeof obliqueView,
    viewB: typeof obliqueView,
    factor: number
  ) => {
    const t = easeInOut(factor);
    cameraPos.lerpVectors(viewA.position, viewB.position, t);
    cameraTarget.lerpVectors(viewA.target, viewB.target, t);
    cameraZoom = THREE.MathUtils.lerp(viewA.zoom, viewB.zoom, t);
  };

  if (stepIndex === 0 || stepIndex === 1) {
    // 00 原题 & 01 建系：稳固在斜视角
    cameraPos.copy(obliqueView.position);
    cameraTarget.copy(obliqueView.target);
    cameraZoom = obliqueView.zoom;
  } else if (stepIndex === 2) {
    // 02 B·投影：“接下来我们来分析选项 B。沿着 y 轴正方向平视过去...”
    // 在前 12% ~ 22% 进度（约前 2~4 秒台词念出“沿着 y 轴平视过去”时）平滑旋转切换到 endOn
    const trans = ramp(stepProgress, 0.08, 0.22);
    blendViews(obliqueView, endOnView, trans);
  } else if (stepIndex === 3) {
    // 03 B·下界：“回到斜视角观察：由于 DD' 垂直于截面...”
    // 在前 0% ~ 14% 进度（台词念出“回到斜视角”时）平滑转回 oblique
    const trans = ramp(stepProgress, 0.0, 0.14);
    blendViews(endOnView, obliqueView, trans);
  } else if (stepIndex === 4) {
    // 04 C·分量：斜视角观察向量点积
    cameraPos.copy(obliqueView.position);
    cameraTarget.copy(obliqueView.target);
  } else if (stepIndex === 5) {
    // 05 C·直角：“只看这个垂直截面内的三角形 OCD...”
    // 开头平滑切入 endOn 正视角展示 1, √3, 2 直角
    const trans = ramp(stepProgress, 0.0, 0.16);
    blendViews(obliqueView, endOnView, trans);
  } else if (stepIndex === 6) {
    // 06 C·判定：“此时显出平面 ABD...”
    // 开头平滑转回 oblique 斜视角观察平面与线
    const trans = ramp(stepProgress, 0.0, 0.16);
    blendViews(endOnView, obliqueView, trans);
  } else if (stepIndex === 7) {
    // 07 A·反例：平滑过渡到特写视角 closeView
    const trans = ramp(stepProgress, 0.05, 0.25);
    blendViews(obliqueView, closeView, trans);
  } else if (stepIndex === 8) {
    // 08 D·反例：保持特写 closeView
    cameraPos.copy(closeView.position);
    cameraTarget.copy(closeView.target);
  } else if (stepIndex === 9) {
    // 09 回看：从 closeView 平滑旋转回到 obliqueView 全景
    const trans = ramp(stepProgress, 0.0, 0.30);
    blendViews(closeView, obliqueView, trans);
  }

  // 3. 图层权重与透明度
  const isMerged = Math.abs(axialC - axialD) < 0.08;
  const isAtA = axialC < 0.15;
  const insetOpacity = stepIndex === 2 || stepIndex === 5 ? (stepIndex === 2 ? ramp(stepProgress, 0.25, 0.35) : 1) : 0;
  const planeOpacity = stepIndex === 6 ? ramp(stepProgress, 0.1, 0.35) : 0;
  const highlight = stepIndex >= 2 && stepIndex <= 8 ? 1 : 0;

  // 4. 字幕与讲解信息
  const isRevealed = meta.revealAt !== undefined && stepProgress >= meta.revealAt;
  const currentCaption = isRevealed && meta.revealCaption ? meta.revealCaption : meta.caption;
  const currentFormula = isRevealed && meta.revealFormula ? meta.revealFormula : meta.formula;

  return {
    timeMs: clampedTime,
    stepIndex,
    stepProgress,
    cameraPosition: cameraPos,
    cameraTarget,
    cameraZoom,
    axialC,
    axialD,
    insetOpacity,
    planeOpacity,
    highlight,
    showSectionLabel: stepIndex <= 1 || stepIndex === 8,
    sectionLabelText: isAtA ? '平面 ACD ⟂ AB' : 'y=y_C ∥ xOz',
    isAtA,
    isMerged,
    stepTitle: meta.title,
    stepLabel: meta.label,
    currentCaption,
    currentFormula,
    currentOption: meta.option,
  };
}
