import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import '@hanzi.pro/webfonts-lxgw-wenkai/block/500.css';
import {FIELD, geometryModel, GptCompass, GptGeometry} from './GptGeometry';
import {GptProblemBar, problemOptions} from './GptProblemBar';
import {CHAPTER_GAP, chapters, chapterWidths, ease, gptFrame, proofTimes, sourceFrameAt, type BoardRow} from './gptTimeline';
import {narrationAt, type Target} from './gptNarrationCues';
import {correctionAt} from './gptCorrections';
import './gptRealVoice.css';

const texCache = new Map<string, string>();
const Formula: React.FC<{tex: string}> = ({tex}) => {
  let html = texCache.get(tex);
  if (!html) {
    html = katex.renderToString(tex, {throwOnError: true, output: 'html', displayMode: false, strict: 'ignore'});
    texCache.set(tex, html);
  }
  return <span dangerouslySetInnerHTML={{__html: html}} />;
};

const columns = chapterWidths().map(w => `${w}px`).join(' ');
const SwipeRow: React.FC<{row: BoardRow; t: number; isActive: boolean}> = ({row, t, isActive}) => {
  const reveal = ease(t, row.at, row.at + .42);
  const cue = narrationAt(t);
  const lit = (targets: readonly Target[]) => cue?.targets.some(id => targets.includes(id)) ? cue.weight : 0;
  const token = (tex: string, targets: readonly Target[], color?: string) => {
    const weight = lit(targets);
    return <span className="gpt-proof-token" style={{color: weight ? color ?? '#ffd18a' : color, backgroundColor: `rgba(255,209,138,${.18 * weight})`, transform: `scale(${1 + .10 * weight})`}}><Formula tex={tex} /></span>;
  };
  const component = (axis: 'X' | 'Y' | 'Z', tex: string, edge: 'AB' | 'CD') => token(tex, [`component${axis}`, edge], axis === 'Y' ? '#ffd18a' : undefined);
  const tuple = (edge: 'AB' | 'CD', xyz: readonly [string,string,string]) => <span className="gpt-proof-tuple">
    {token(String.raw`\vec{${edge}}=(`, [edge])}
    {component('X', xyz[0], edge)}<Formula tex=",\," />
    {component('Y', xyz[1], edge)}<Formula tex=",\," />
    {component('Z', xyz[2], edge)}<Formula tex=")" />
  </span>;
  let content = <Formula tex={row.tex} />;
  if (row.id === 'components') content = <>
    {tuple('AB', ['0','y_B','0'])}
    {t >= proofTimes.componentCD && tuple('CD', [String.raw`\Delta x`,'y_D-y_C',String.raw`\Delta z`])}
  </>;
  if (row.id === 'dotC') content = <>
    {token(String.raw`\vec{AB}\cdot\vec{CD}=`, ['AB','CD','product'])}
    {token(String.raw`y_B(y_D-y_C)`, ['componentY','product'])}
  </>;
  if (row.id === 'zeroC') content = token(row.tex, ['zero','componentY']);
  if (row.id === 'vectorsD') content = <>
    {token(String.raw`\vec{AC}=(0,0,2)`, ['AC','C'], '#79b1ff')}
    {t >= proofTimes.vectorAD && token(String.raw`\vec{AD}=(\tfrac{\sqrt3}{2},0,\tfrac12)`, ['AD','D'], '#62e5c4')}
  </>;
  if (row.id === 'angleD') content = token(row.tex, ['angleA']);
  if (row.id === 'dotD') content = <>
    {token(String.raw`\vec{AC}\cdot\vec{AD}=`, ['AC','AD'])}
    {token(String.raw`0\cdot\tfrac{\sqrt3}{2}+0\cdot0+2\cdot\tfrac12`, ['AC','AD','product'])}
    {token(String.raw`=1\ne0`, ['product','zero'])}
  </>;
  return <div className={`gpt-proof-row ${isActive ? 'is-active' : ''}`} style={{opacity: reveal, transform: `translateX(${(1 - reveal) * -11}px)`}}>
    <div className="gpt-row-text">{row.text}</div><div className={`gpt-formula ${row.id ? `is-${row.id}` : ''}`}>{content}</div>
  </div>;
};

export const GptRealVoice: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const f = gptFrame(sourceFrameAt(frame) / fps);
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
  return <AbsoluteFill className="gpt-film">
    <AbsoluteFill className="gpt-scene" style={{opacity: fade}}>
    <GptGeometry f={f} m={m} />
    {isBoard && <div className="gpt-board-shade" style={{opacity: f.board}} />}
    <div className="gpt-view-tag"><span />{f.dView > .85 ? 'xOz 微斜视' : f.endOn > .93 ? '沿 AB 正视' : f.endOn > .08 ? '视线转动' : f.close > .5 ? '反例近景' : '空间斜视'}</div>
    <div className="gpt-legend"><span><i style={{background: '#79b1ff'}} />外轨 C</span><span><i style={{background: '#62e5c4'}} />内轨 D</span><span><i style={{background: '#ff977d'}} />{f.t < 64 ? '截面示意' : '当前连线'}</span></div>
    <section className={`gpt-panel ${isBoard ? 'is-board' : ''} ${isEnd ? 'is-end' : ''}`}>
      <div className="gpt-kicker"><span>{String(f.chapterIndex + 1).padStart(2, '0')}</span>{f.beat.kicker}{isBoard && <i>推导板书</i>}</div>
      <div className="gpt-title">{f.beat.title}</div>
      <div className="gpt-note">{f.beat.note}</div>
      <div className="gpt-panel-body">
        {isProblem ? <div className="gpt-intro-spec"><div><b>2</b><small>C 到 AB</small></div><div><b>1</b><small>D 到 AB</small></div><div style={{opacity: .93}}><b>60°</b><small>二面角</small></div></div>
          : isEnd ? <div className="gpt-results">{problemOptions.map(([key, value]) => {
            const yes = key === 'B' || key === 'C';
            return <div className={yes ? 'correct' : 'incorrect'} key={key}><strong>{key}</strong><span>{value}</span><i>{yes ? '成立' : '反例'}</i></div>;
          })}</div>
            : f.rows.map((row, i) => <SwipeRow key={row.at} row={row} t={f.t} isActive={i === f.rows.length - 1} />)}
      </div>
      {resolved && !isEnd && <div className={`gpt-answer ${isCorrect ? 'correct' : 'incorrect'} ${f.rows.length >= 4 ? 'after-proof' : ''}`}><span>{isCorrect ? '✓' : '×'}</span>{f.chapter.key} {isCorrect ? '成立' : '不成立'}</div>}
      <div className="gpt-panel-foot"><span>几何讲义</span><span>G P T / 原声版</span></div>
    </section>
    {isBoard && anchor && <svg className="gpt-leader" width="1920" height="1080" aria-hidden="true" style={{opacity: f.board * .9}}>
      <path d={`M 654 ${startY} C 780 ${startY}, ${Math.max(x - 106, 828)} ${y - 50}, ${x} ${y}`} pathLength="1" fill="none" stroke="#91c0ff" strokeWidth="2.2" strokeDasharray="1" strokeDashoffset={1 - lineReveal} />
      <circle cx={x} cy={y} r={16 + (1 - lineReveal) * 9} fill="none" stroke="#91c0ff" strokeWidth="2" strokeDasharray="4 4" opacity={lineReveal} />
    </svg>}
    <div className="gpt-caption"><div style={{opacity: f.caption ? 1 : 0}}>{f.caption}</div>
      {correctionAt(f.t) && <span className="gpt-caption-correction">{correctionAt(f.t)!.text}</span>}
    </div>
    <div className="gpt-chapters" style={{gridTemplateColumns: columns, gap: CHAPTER_GAP}}>{chapters.map((chapter, i) => <div className={i === f.chapterIndex ? 'is-current' : ''} key={chapter.key}>
      <div className="gpt-progress"><span style={{width: `${100 * (i < f.chapterIndex ? 1 : i === f.chapterIndex ? f.chapterProgress : 0)}%`}} /></div>
      <div className="gpt-chapter-label"><b>{chapter.tag}</b>{chapter.label}</div>
    </div>)}</div>
    </AbsoluteFill>
    <GptCompass m={m} t={f.t} />
    <GptProblemBar t={frame / fps} />
  </AbsoluteFill>;
};
