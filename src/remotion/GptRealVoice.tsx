import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import '@hanzi.pro/webfonts-lxgw-wenkai/block/500.css';
import {FIELD, geometryModel, GptGeometry} from './GptGeometry';
import {chapters, ease, gptFrame, type BoardRow} from './gptTimeline';
import './gptRealVoice.css';

const options = [
  ['A', '∠CAD ≥ 60°'], ['B', 'CD ≥ √3'],
  ['C', '若 AB ⊥ CD，则 CD ⊥ 平面 ABD'], ['D', '若 AB ⊥ 平面 ACD，则 AC ⊥ AD'],
] as const;

const texCache = new Map<string, string>();
const Formula: React.FC<{tex: string}> = ({tex}) => {
  let html = texCache.get(tex);
  if (!html) {
    html = katex.renderToString(tex, {throwOnError: true, output: 'html', displayMode: false, strict: 'ignore'});
    texCache.set(tex, html);
  }
  return <span dangerouslySetInnerHTML={{__html: html}} />;
};

const SwipeRow: React.FC<{row: BoardRow; t: number; isActive: boolean}> = ({row, t, isActive}) => {
  const reveal = ease(t, row.at, row.at + .42);
  return <div className={`gpt-proof-row ${isActive ? 'is-active' : ''}`} style={{opacity: reveal, transform: `translateX(${(1 - reveal) * -11}px)`}}>
    <div className="gpt-row-text">{row.text}</div><div className="gpt-formula"><Formula tex={row.tex} /></div>
  </div>;
};

const clock = (sec: number) => `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;

export const GptRealVoice: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const f = gptFrame(frame / fps);
  const m = geometryModel(f);
  const isBoard = f.board > 0;
  const isEnd = f.chapter.key === 'end';
  const isProblem = f.t < 25;
  const active = f.rows.at(-1);
  const anchor = active?.anchor && m.project(m[active.anchor]);
  const x = anchor ? FIELD.x + anchor.x : 0;
  const y = anchor ? FIELD.y + anchor.y : 0;
  const lineReveal = active ? ease(f.t, active.at + .18, active.at + 1.3) : 0;
  const startY = 353 + (f.rows.length - 1) * 91 + 50;
  const isCorrect = f.chapter.key === 'B' || f.chapter.key === 'C';
  const resolved = (f.t > 151 && f.t < 172) || (f.t > 462.52 && f.chapter.key === 'C') || (f.t > 514.96 && f.chapter.key === 'A') || (f.t > 568.56 && f.chapter.key === 'D');
  const fade = 1 - ease(f.t, 587.60, 588.11) * .98;
  return <AbsoluteFill className="gpt-film" style={{opacity: fade}}>
    <header className="gpt-head">
      <span className="gpt-index">10<span>.</span></span>
      <div className="gpt-head-title">全国Ⅰ卷 · 2026<span>空间几何 / 二面角</span></div>
      <div className="gpt-head-right"><span className="gpt-live" />真人原声<span className="gpt-clock">{clock(f.t)} / 09:48</span></div>
    </header>
    <GptGeometry f={f} m={m} />
    {isBoard && <div className="gpt-board-shade" style={{opacity: f.board}} />}
    <div className="gpt-view-tag"><span />{f.endOn > .93 ? '沿 AB 正视' : f.endOn > .08 ? '视线转动' : f.close > .5 ? '反例近景' : '空间斜视'}</div>
    <div className="gpt-legend"><span><i style={{background: '#79b1ff'}} />外轨 C</span><span><i style={{background: '#62e5c4'}} />内轨 D</span><span><i style={{background: '#ff977d'}} />{f.t < 64 ? '截面示意' : '当前连线'}</span></div>
    <section className={`gpt-panel ${isBoard ? 'is-board' : ''} ${isEnd ? 'is-end' : ''}`}>
      <div className="gpt-kicker"><span>{String(f.chapterIndex + 1).padStart(2, '0')}</span>{f.beat.kicker}{isBoard && <i>推导板书</i>}</div>
      <div className="gpt-title">{f.beat.title}</div>
      <div className="gpt-note">{f.beat.note}</div>
      <div className="gpt-panel-body">
        {isProblem ? <><div className="gpt-intro-spec"><div><b>2</b><small>C 到 AB</small></div><div><b>1</b><small>D 到 AB</small></div><div style={{opacity: .93}}><b>60°</b><small>二面角</small></div></div>
          <div className="gpt-option-list">{options.map(([key, value]) => <div key={key}><span>{key}</span>{value}</div>)}</div></>
          : isEnd ? <div className="gpt-results">{options.map(([key, value]) => {
            const yes = key === 'B' || key === 'C';
            return <div className={yes ? 'correct' : 'incorrect'} key={key}><strong>{key}</strong><span>{value}</span><i>{yes ? '成立' : '反例'}</i></div>;
          })}</div>
            : f.rows.map((row, i) => <SwipeRow key={row.at} row={row} t={f.t} isActive={i === f.rows.length - 1} />)}
      </div>
      {resolved && !isEnd && <div className={`gpt-answer ${isCorrect ? 'correct' : 'incorrect'}`}><span>{isCorrect ? '✓' : '×'}</span>{f.chapter.key} {isCorrect ? '成立' : '不成立'}</div>}
      <div className="gpt-panel-foot"><span>几何讲义</span><span>G P T / 原声版</span></div>
    </section>
    {isBoard && anchor && <svg className="gpt-leader" width="1920" height="1080" aria-hidden="true" style={{opacity: f.board * .9}}>
      <path d={`M 654 ${startY} C 780 ${startY}, ${Math.max(x - 106, 828)} ${y - 50}, ${x} ${y}`} pathLength="1" fill="none" stroke="#91c0ff" strokeWidth="2.2" strokeDasharray="1" strokeDashoffset={1 - lineReveal} />
      <circle cx={x} cy={y} r={16 + (1 - lineReveal) * 9} fill="none" stroke="#91c0ff" strokeWidth="2" strokeDasharray="4 4" opacity={lineReveal} />
    </svg>}
    <div className="gpt-caption"><div style={{opacity: f.caption ? 1 : 0}}>{f.caption}</div></div>
    <div className="gpt-chapters">{chapters.map((chapter, i) => <div className={i === f.chapterIndex ? 'is-current' : ''} key={chapter.key}>
      <div className="gpt-progress"><span style={{width: `${100 * (i < f.chapterIndex ? 1 : i === f.chapterIndex ? f.chapterProgress : 0)}%`}} /></div>
      <div className="gpt-chapter-label"><b>{chapter.tag}</b>{chapter.label}</div>
    </div>)}</div>
  </AbsoluteFill>;
};
