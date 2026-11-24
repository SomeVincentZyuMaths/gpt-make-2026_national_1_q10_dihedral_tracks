import React from 'react';
import {FPS, FRAMES} from './gptTimeline';

// Shared with the answer card; the bar never decorates these with correctness.
export const problemOptions = [
  ['A', '∠CAD ≥ 60°'], ['B', 'CD ≥ √3'],
  ['C', '若 AB ⊥ CD，则 CD ⊥ 平面 ABD'], ['D', '若 AB ⊥ 平面 ACD，则 AC ⊥ AD'],
] as const;

const clock = (seconds: number) => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;

export const GptProblemBar: React.FC<{t: number}> = ({t}) => <header className="gpt-head" aria-label="第 10 题完整题目">
  <div className="gpt-head-main">
    <div className="gpt-head-id"><span className="gpt-index">10<span>.</span></span><span>全国Ⅰ卷 · <b className="gpt-numeric">2026</b></span></div>
    <div className="gpt-problem-stem">
      <div>在空间中，A、B 为定点，动点 C、D 到直线 AB 的距离分别为 <b className="gpt-numeric">2</b> 和 <b className="gpt-numeric">1</b>。</div>
      <div>若二面角 C–AB–D 为 <b className="gpt-numeric">60°</b>，下列哪些结论正确？</div>
    </div>
    <div className="gpt-head-right"><span className="gpt-live" />真人原声<span className="gpt-clock">{clock(t)} / {clock(FRAMES / FPS)}</span></div>
  </div>
  <div className="gpt-problem-options">{problemOptions.map(([key, value]) =>
    <div className="gpt-problem-option" key={key}><b className="gpt-option-key">{key}</b><span>{value}</span></div>)}</div>
</header>;
