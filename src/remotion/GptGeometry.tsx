import React from 'react';
import {OrthographicCamera, Vector3} from 'three';
import {pointC, pointD, TRACKS} from '../scenes/dihedralMath';
import {ease, type GptFrame} from './gptTimeline';

export const FIELD = {x: 714, y: 142, w: 1134, h: 740};
const cobalt = '#79b1ff';
const mint = '#62e5c4';
const amber = '#ffd18a';
const coral = '#ff977d';
const chalk = '#e6eefc';
const axis = '#8596bd';
const turn = Math.PI / 3;
const v = (x: number, y: number, z: number) => new Vector3(x, y, z);
const radial = (y: number, r: number, a: number) => v(r * Math.sin(a), y, r * Math.cos(a));
const arcPoints = (fn: (n: number) => Vector3, n = 40) => Array.from({length: n + 1}, (_, i) => fn(i / n));
const lerp = (a: number, b: number, q: number) => a + (b - a) * q;
const xy = (p: P) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`;
type P = {x: number; y: number};

export function geometryModel(f: GptFrame) {
  const azimuth = lerp(lerp(0.80, 1.10, f.close), 0, f.endOn);
  const elevation = lerp(lerp(0.62, 0.77, f.close), 0, f.endOn);
  const target = v(0, lerp(lerp(4.9, 1.1, f.close), f.axialC, f.endOn), lerp(lerp(0.40, 0.68, f.close), 0.10, f.endOn));
  const view = v(Math.sin(azimuth) * Math.cos(elevation), -Math.cos(azimuth) * Math.cos(elevation), Math.sin(elevation));
  const scale = lerp(lerp(87, 144, f.close), 136, f.endOn);
  const camera = new OrthographicCamera(-FIELD.w / 2 / scale, FIELD.w / 2 / scale, FIELD.h / 2 / scale, -FIELD.h / 2 / scale, 0.1, 100);
  camera.position.copy(target).addScaledVector(view, 26);
  camera.up.set(0, 0, 1);
  camera.lookAt(target);
  camera.updateMatrixWorld(true);
  const project = (p: Vector3): P => {
    const q = p.clone().project(camera);
    return {x: FIELD.w * (q.x + 1) / 2, y: FIELD.h * (1 - q.y) / 2 + 10 + 18 * f.endOn};
  };
  const makePoint = (base: [number, number, number]) => {
    const [x, y, z] = base;
    return radial(y, Math.hypot(x, z), Math.atan2(x, z) + f.angle);
  };
  const A = v(0, 0, 0);
  const B = v(0, TRACKS.abLength, 0);
  const O = v(0, f.axialC, 0);
  const O2 = v(0, f.axialD, 0);
  const C = makePoint(pointC(f.axialC));
  const D = makePoint(pointD(f.axialD));
  const Dprime = makePoint(pointD(f.axialC));
  return {project, A, B, O, O2, C, D, Dprime};
}

type Model = ReturnType<typeof geometryModel>;
export const GptGeometry: React.FC<{f: GptFrame; m: Model}> = ({f, m}) => {
  const {project, A, B, O, O2, C, D, Dprime} = m;
  const {t, endOn, merged, isAtA, close} = f;
  const intro = t < 25;
  const projection = t >= 43 && t < 378;
  const bOption = f.chapter.key === 'B';
  const cProof = t >= 388 && t < 465;
  const counterA = t >= 472 && f.chapter.key === 'A';
  const counterD = f.chapter.key === 'D';
  const verdict = f.chapter.key === 'end';
  const section = t >= 27;
  const trackWeight = intro ? 0.86 : lerp(0.4, 0.17, Math.max(endOn, close));
  const axisWeight = 1 - 0.8 * endOn;
  const circle = (y: number, r: number) => arcPoints((a) => radial(y, r, a * 2 * Math.PI), 46);
  const points = (list: Vector3[]) => list.map((p) => xy(project(p))).join(' ');
  const path = (list: Vector3[]) => `M ${list.map((p) => xy(project(p))).join(' L ')}`;
  const segment = (a: Vector3, b: Vector3, stroke: string, width: number, opacity = 1, dash?: string, arrow?: string) => {
    const p = project(a);
    const q = project(b);
    return <line x1={p.x} y1={p.y} x2={q.x} y2={q.y} stroke={stroke} strokeWidth={width} opacity={opacity} strokeDasharray={dash} markerEnd={arrow ? `url(#gpt-arrow-${arrow})` : undefined} />;
  };
  const tag = (p: Vector3, text: string, color = chalk, dx = 0, dy = -20, opacity = 1, size = 25) => {
    const q = project(p);
    return <text x={q.x + dx} y={q.y + dy} fill={color} textAnchor="middle" opacity={opacity} fontSize={size} className="gpt-svg-label">{text}</text>;
  };
  const dot = (p: Vector3, text: string, color = chalk, dx = 0, dy = -22, opacity = 1, r = 7) => {
    const q = project(p);
    return <g opacity={opacity}><circle cx={q.x} cy={q.y} r={r + 5} fill={color} fillOpacity=".12" /><circle cx={q.x} cy={q.y} r={r} fill={color} stroke="#091323" strokeWidth="2" />{tag(p, text, color, dx, dy)}</g>;
  };
  const between = (a: Vector3, b: Vector3, q = 0.5) => a.clone().lerp(b, q);
  const rightAngle = (center: Vector3, a: Vector3, b: Vector3, size = 0.25) => {
    const u = a.clone().sub(center).normalize().multiplyScalar(size);
    const w = b.clone().sub(center).normalize().multiplyScalar(size);
    return <path d={path([center.clone().add(u), center.clone().add(u).add(w), center.clone().add(w)])} stroke={amber} strokeWidth="3" fill="none" />;
  };
  const angular = (center: Vector3, a: Vector3, b: Vector3, r: number, str: string, dx = 0, dy = 0) => {
    const u = a.clone().sub(center).normalize();
    const w = b.clone().sub(center).normalize();
    const theta = u.angleTo(w);
    const normal = w.clone().addScaledVector(u, -w.dot(u)).normalize();
    const at = (a: number, radius: number) => center.clone().addScaledVector(u, radius * Math.cos(theta * a)).addScaledVector(normal, radius * Math.sin(theta * a));
    return <g><path d={path(arcPoints((q) => at(q, r), 20))} stroke={amber} strokeWidth="3.2" fill="none" />{tag(at(.48, r + .23), str, amber, dx, dy)}</g>;
  };
  const endOpacity = ease(endOn, 0.7, 0.98);
  const dSide = t >= 43 && !merged && !verdict;
  const screenD = project(D);
  const screenP = project(Dprime);
  const dSeparate = Math.hypot(screenD.x - screenP.x, screenD.y - screenP.y);
  const dVisible = dSide ? ease(dSeparate, 13, 52) : 1;
  const abPlane = cProof && t >= 439;
  const planeEdges = [radial(-.1, -.47, turn), radial(10.2, -.47, turn), radial(10.2, 1.8, turn), radial(-.1, 1.8, turn)];
  const showSectionTriangle = projection || cProof || counterA || counterD || verdict;
  const showCPrime = projection && (t < 378) && (f.chapter.key !== 'C' || t >= 312);
  const showSpaceCd = (bOption || f.chapter.key === 'C' || counterA || counterD || verdict) && !(showCPrime && !merged && endOn > .9);
  const cdColor = cProof || counterA || counterD || merged ? coral : chalk;
  const angle60 = (t >= 44 && (t < 103 || (t >= 224 && t < 276))) || (counterD && t >= 564.8);
  const fullDrawing = !(intro && t < 10);
  return <svg className="gpt-field" width={FIELD.w} height={FIELD.h} viewBox={`0 0 ${FIELD.w} ${FIELD.h}`} aria-hidden="true">
    <defs>
      <pattern id="gpt-dots" width="24" height="24" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1" fill="#789bd7" opacity=".19" /></pattern>
      <radialGradient id="gpt-field-light" cx="52%" cy="44%" r="70%"><stop stopColor="#1b2d4b" /><stop offset="1" stopColor="#0b1526" /></radialGradient>
      <marker id="gpt-arrow-cobalt" viewBox="0 0 10 10" markerWidth="8" markerHeight="8" refX="8" refY="5" orient="auto-start-reverse" markerUnits="userSpaceOnUse"><path d="M0 0L10 5L0 10z" fill={cobalt} /></marker>
      <marker id="gpt-arrow-amber" viewBox="0 0 10 10" markerWidth="12" markerHeight="12" refX="9" refY="5" orient="auto-start-reverse" markerUnits="userSpaceOnUse"><path d="M0 0L10 5L0 10z" fill={amber} /></marker>
    </defs>
    <rect x="1" y="1" width={FIELD.w - 2} height={FIELD.h - 2} rx="24" fill="url(#gpt-field-light)" stroke="#29405e" />
    <rect x="2" y="2" width={FIELD.w - 4} height={FIELD.h - 4} rx="24" fill="url(#gpt-dots)" />
    <g opacity={verdict ? .69 : 1} strokeLinecap="round" strokeLinejoin="round">
      {/* Rings and generatrices are all projected from the same world coordinates as the proof. */}
      <g opacity={trackWeight * (1 - 0.87 * endOn)}>
        {[{r: 2, color: cobalt}, {r: 1, color: mint}].map(({r, color}) => <g key={r}>
          {[0, 2, 4, 6, 8, 10].map((y) => <path key={y} d={path(circle(y, r))} stroke={color} strokeOpacity={y % 10 ? .41 : .74} strokeWidth="1.45" fill="none" />)}
          {Array.from({length: 8}, (_, i) => i * Math.PI / 4).map((a) => <React.Fragment key={a}>{segment(radial(0, r, a), radial(10, r, a), color, 1.2, .42, '5 7')}</React.Fragment>)}
        </g>)}
      </g>
      {section && <g opacity={verdict ? .56 : 1}><path d={path(circle(f.axialC, 2.30)) + ' Z'} fill="#73a7ff" fillOpacity={endOn > .9 ? .08 : .045} stroke={cobalt} strokeOpacity={.42 + endOn * .12} strokeWidth="1.7" />
        {(!merged || endOn > .7) && <path d={path(circle(f.axialD, 1)) + ' Z'} fill="none" stroke={mint} strokeOpacity=".33" strokeWidth="1.6" strokeDasharray="5 5" />}</g>}
      {showSectionTriangle && <polygon points={points([O, C, Dprime])} fill={cobalt} fillOpacity={endOn > .85 ? .14 : .045} />}
      {abPlane && <g opacity={ease(t, 438, 442)}><polygon points={points(planeEdges)} fill="#588dff" fillOpacity=".20" stroke="#769df4" strokeOpacity=".65" strokeWidth="1.5" />{tag(radial(7.2, 1.5, turn), '平面 ABD', cobalt, 24, -10)}</g>}
      {counterA && <polygon points={points([A, C, D])} fill={coral} fillOpacity=".105" />}
      {segment(A, B, abPlane ? amber : axis, abPlane ? 4.8 : 2.5, axisWeight)}
      {t >= 25 && t < 64 && <g>{segment(A, v(1.45, 0, 0), cobalt, 1.65, .6, undefined, 'cobalt')}{segment(A, v(0, 0, 2.65), cobalt, 1.65, .68, undefined, 'cobalt')}{tag(v(1.55, 0, 0), 'x', cobalt, 8, 2, .8, 20)}{tag(v(0, 0, 2.65), 'z', cobalt, 0, -12, .8, 20)}</g>}
      {tag(B, 'y', axis, 28, 18, (1 - endOpacity) * (1 - close * .96), 18)}
      {segment(O, C, cobalt, 3.3, 1, intro ? '7 6' : undefined)}
      {fullDrawing && segment(O2, D, mint, abPlane ? 5 : 3.25, 1, intro ? '7 6' : undefined)}
      {dSide && segment(O, Dprime, mint, 2.6, .75, merged ? undefined : '7 6')}
      {showSpaceCd && segment(C, D, cdColor, 4.4, showCPrime && !merged ? .53 : .96)}
      {showCPrime && !merged && segment(C, Dprime, coral, 4.6, 1, undefined, t >= 109 && endOn < .96 ? 'amber' : undefined)}
      {showCPrime && !merged && t >= 103 && segment(Dprime, D, amber, 3.5, dVisible, '8 7', 'amber')}
      {showCPrime && !merged && t >= 121 && t < 224 && <g opacity={dVisible}>{rightAngle(Dprime, C, D, .235)}</g>}
      {counterA && <g>{segment(A, O, amber, 4, .93)}{segment(A, C, cobalt, 3.5, .88)}{segment(A, D, mint, 4.6)}{t >= 488 && rightAngle(D, C, A)}</g>}
      {((cProof && t >= 431) || (counterA && t >= 488)) && !counterA && rightAngle(D, O, C)}
      {angle60 && angular(O, C, Dprime, .59, '60°', endOn > .8 ? 4 : -8, endOn > .8 ? -7 : -16)}
      {counterA && t >= 513 && angular(A, C, D, .68, '45°', -10, -5)}
      {t >= 29 && (endOn > .83 || t < 44) && tag(between(O, C, .56), '2', cobalt, -22, 0, 1, 25)}
      {t >= 36 && (endOn > .83 || t < 44) && tag(between(endOn > .83 ? O : O2, endOn > .83 ? Dprime : D, .64), '1', mint, endOn > .83 ? 13 : -2, 25, 1, 25)}
      {t >= 74.3 && (bOption || cProof || (counterA && t >= 488)) && tag(between(C, showCPrime ? Dprime : D), endOn > .86 || merged ? '√3' : 'CD′ = √3', coral, endOn > .86 ? 56 : 25, -12, bOption || t >= 416 ? 1 : 0, 27)}
      {counterA && t >= 488 && tag(between(A, D, .65), '√3', mint, 23, 25, 1, 27)}
      {counterA && t >= 479 && tag(between(A, O, .66), '√2', amber, -4, -7, 1, 22)}
      {dot(A, isAtA ? 'A = O' : 'A', amber, isAtA ? -44 : -5, 36, isAtA ? 1 : (1 - endOpacity))}
      {dot(B, 'B', axis, 8, -20, (1 - endOpacity) * (1 - .98 * close), 6)}
      {section && !isAtA && dot(O, merged ? 'O' : 'O₁', chalk, endOn > .82 ? -17 : 0, 34, 1, 5)}
      {section && !merged && dot(O2, 'O₂', axis, -13, 35, dVisible, 5)}
      {dot(C, 'C', cobalt, -5, -23, 1, 9)}
      {fullDrawing && dot(D, 'D', mint, 12, 30, dVisible, 9)}
      {dSide && dot(Dprime, 'D′', mint, 26, endOn > .7 ? 5 : 23, .6 + .4 * endOpacity, 6)}
      {endOn > .94 && !isAtA && <g opacity={endOpacity * .71}>{tag(O, '⊙', cobalt, 0, 8, 1, 29)}</g>}
    </g>
  </svg>;
};
