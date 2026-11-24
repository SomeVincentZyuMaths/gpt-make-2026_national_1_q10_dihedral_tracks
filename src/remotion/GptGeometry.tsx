import React from 'react';
import {OrthographicCamera, Vector3} from 'three';
import {pointC, pointD, TRACKS} from '../scenes/dihedralMath';
import {closingCylinders, ease, openingCylinders, proofTimes, sectionDemo, type GptFrame} from './gptTimeline';
import {correctionAt} from './gptCorrections';
import {screenDepth, vectorEnds, vectorMove, vectorProjection, type VectorName} from './gptVectorCues';
import {cameraCue, SECTION_RIGHT_ANGLE_AT} from './gptMotionCues';
import {edgesSpoken, narrationAt, pointsSpoken, type EdgeSpoken, type PointSpoken, type Target} from './gptNarrationCues';

export const FIELD = {x: 714, y: 142, w: 1134, h: 740};
const cobalt = '#79b1ff';
const mint = '#62e5c4';
const amber = '#ffd18a';
const coral = '#ff977d';
const chalk = '#e6eefc';
const axis = '#8596bd';
const axisX = '#a4baff';
const axisZ = '#b19fe9';
const vectorEdges: Record<VectorName, EdgeSpoken> = {AB:'AB', CD:'CD', CDprime:'CDp', DprimeD:'DpD', AC:'AC', AD:'AD'};
const edgeLabels: Record<EdgeSpoken, string> = {AB:'AB', CO1:'CO₁', O2D:'O₂D', O1Dp:'O₁D′', CDp:'CD′', DpD:'DD′', CD:'CD', OD:'OD', AO:'AO', AC:'AC', AD:'AD'};
const turn = Math.PI / 3;
const v = (x: number, y: number, z: number) => new Vector3(x, y, z);
const radial = (y: number, r: number, a: number) => v(r * Math.sin(a), y, r * Math.cos(a));
const arcPoints = (fn: (n: number) => Vector3, n = 40) => Array.from({length: n + 1}, (_, i) => fn(i / n));
const lerp = (a: number, b: number, q: number) => a + (b - a) * q;
const xy = (p: P) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`;
type P = {x: number; y: number};

export function geometryModel(f: GptFrame, withMotion = true) {
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
  const cue = withMotion ? cameraCue(f) : undefined;
  const focus = O.clone().add(C).add(D).multiplyScalar(1 / 3);
  const roomForCylinders = Math.max(f.review, ease(f.t, 16.8, 19.25) * (1 - ease(f.t, 34.62, 36.6)));
  const baseScale = lerp(lerp(lerp(87 - 4.5 * roomForCylinders, 144, f.close), 136, f.endOn), 124, f.dView);
  const makeView = (weight: number): {view: Vector3; project: (p: Vector3) => P} => {
    // Look from the other side of xOz so the projected AB and AD do not overlap.
    const azimuth = lerp(lerp(lerp(.80, 1.10, f.close), 0, f.endOn), -Math.PI / 10, f.dView) + (cue?.yaw ?? 0) * weight * Math.PI / 180;
    const elevation = lerp(lerp(lerp(.62, .77, f.close), 0, f.endOn), Math.PI / 18, f.dView) + (cue?.pitch ?? 0) * weight * Math.PI / 180;
    const target = v(.55 * f.dView, lerp(lerp(lerp(4.9, 1.1, f.close), f.axialC, f.endOn), f.axialC, f.dView), lerp(lerp(lerp(.40, .68, f.close), .10, f.endOn), .47, f.dView));
    const view = v(Math.sin(azimuth) * Math.cos(elevation), -Math.cos(azimuth) * Math.cos(elevation), Math.sin(elevation));
    const scale = baseScale * (1 + (cue?.zoom ?? 0) * weight);
    const camera = new OrthographicCamera(-FIELD.w / 2 / scale, FIELD.w / 2 / scale, FIELD.h / 2 / scale, -FIELD.h / 2 / scale, .1, 100);
    camera.position.copy(target).addScaledVector(view, 26);
    camera.up.set(0, 0, 1);
    camera.lookAt(target);
    camera.updateMatrixWorld(true);
    const projectUnshifted = (p: Vector3): P => {
      const q = p.clone().project(camera);
      return {x: FIELD.w * (q.x + 1) / 2, y: FIELD.h * (1 - q.y) / 2 + 10 + 18 * f.endOn};
    };
    if (!weight || !cue || (!cue.pan && !cue.zoom)) return {view, project: projectUnshifted};
    const at = projectUnshifted(focus);
    const desired = cue.pan ? {x: FIELD.w / 2, y: FIELD.h / 2} : makeView(0).project(focus);
    const dx = desired.x - at.x;
    const dy = desired.y - at.y;
    const maxShift = cue.pan ? cue.pan * weight : Infinity;
    const fraction = Math.min(1, maxShift / Math.max(1, Math.hypot(dx, dy)));
    return {view, project: (p: Vector3): P => {
      const q = projectUnshifted(p);
      return {x: q.x + dx * fraction, y: q.y + dy * fraction};
    }};
  };
  const base = makeView(0);
  let shot = base;
  if (cue) {
    // Only guard geometry that started inside the safe area, so an already
    // off-screen label cannot suppress an unrelated camera accent.
    const safe = ({x, y}: P) => x >= 53 && x <= FIELD.w - 53 && y >= 62 && y <= FIELD.h - 48 && !(x >= 850 && y >= 495);
    const anchors = [A, B, C, D, O, O2, Dprime].filter((p) => safe(base.project(p)));
    for (const factor of [1, .75, .5, .25]) {
      const candidate = makeView(cue.weight * factor);
      if (anchors.every((p) => safe(candidate.project(p)))) { shot = candidate; break; }
    }
  }
  return {...shot, A, B, O, O2, C, D, Dprime};
}

type Model = ReturnType<typeof geometryModel>;
const screenDistance = (a: P, b: P) => Math.hypot(a.x - b.x, a.y - b.y);

export function worldAxesOpacity(f: GptFrame, m: Model) {
  const a = m.project(m.A);
  const b = m.project(m.B);
  const room = Math.min(a.x - 40, FIELD.w - 40 - a.x, a.y - 62, FIELD.h - 50 - a.y, FIELD.w - 42 - b.x, b.y - 51);
  const proofRoom = Math.min(...[m.O, m.C, m.D].map((p) => screenDistance(a, m.project(p))));
  return ease(room, 4, 73) * ease(proofRoom, 43, 135) * (1 - ease(f.endOn, .49, .78));
}

function depthMark(x: number, y: number, depth: 'in' | 'out', color: string, r = 9) {
  return <g transform={`translate(${x} ${y})`}>
    <circle r={r} fill="#101a2a" stroke={color} strokeWidth="1.7" />
    {depth === 'out' ? <circle r={r * .28} fill={color} /> : <path d={`M${-r * .38} ${-r * .38} L${r * .38} ${r * .38} M${-r * .38} ${r * .38} L${r * .38} ${-r * .38}`} fill="none" stroke={color} strokeWidth="1.65" />}
  </g>;
}

function arrowTip(p: P, dx: number, dy: number, size: number, color: string, outlined = false) {
  const d = `M ${xy(p)} L ${xy({x: p.x - dx * size - dy * size * .44, y: p.y - dy * size + dx * size * .44})} L ${xy({x: p.x - dx * size + dy * size * .44, y: p.y - dy * size - dx * size * .44})} Z`;
  return <path d={d} fill={color} stroke={outlined ? '#111b30' : undefined} strokeWidth="2" paintOrder="stroke" />;
}

export const GptCompass: React.FC<{m: Model; t?: number}> = ({m, t = -1}) => {
  const cue = narrationAt(t);
  const origin = {x: 977, y: 619};
  const axes = [['x', v(1, 0, 0), axisX], ['y', v(0, 1, 0), axis], ['z', v(0, 0, 1), axisZ]] as const;
  const a = m.project(m.A);
  return <svg className="gpt-compass" aria-hidden="true" width="207" height="162" viewBox="891 531 207 162" strokeLinecap="round" strokeLinejoin="round"
    style={{position: 'absolute', left: FIELD.x + 891, top: FIELD.y + 531, pointerEvents: 'none'}}>
    <rect x="892" y="532" width="205" height="160" rx="13" fill="#0b1526" fillOpacity=".75" stroke="#2d4160" />
    {axes.map(([name, positive, base]) => {
      const emphasize = cue?.targets.includes(name) || (name === 'y' && cue?.targets.includes('AB'));
      const color = emphasize ? `color-mix(in srgb, ${base}, #fff1b1 ${Math.round(72 * cue!.weight)}%)` : base;
      const p = m.project(positive);
      const dx = p.x - a.x;
      const dy = p.y - a.y;
      const length = Math.hypot(dx, dy);
      const ratio = Math.sqrt(Math.max(0, 1 - positive.dot(m.view) ** 2));
      const weight = ease(ratio, .10, .33);
      const stepX = length ? dx / length : 0;
      const stepY = length ? dy / length : 0;
      const span = lerp(17, 55, weight);
      const end = {x: origin.x + stepX * span, y: origin.y + stepY * span};
      return <g key={name} data-narrate={emphasize ? name : undefined}>
        {weight > 0 && <g opacity={weight}>
          <line x1={origin.x} y1={origin.y} x2={end.x} y2={end.y} stroke={color} strokeWidth="2" />
          {arrowTip(end, stepX, stepY, 8, color)}
          <text x={end.x + stepX * 15} y={end.y + stepY * 13 + 6} fill={color} textAnchor="middle" fontSize="19" className="gpt-svg-label">{name}</text>
        </g>}
        {weight < 1 && <g opacity={1 - weight}>
          <text x={origin.x - 48} y={origin.y + 6} fill={color} textAnchor="middle" fontSize="19" className="gpt-svg-label">{name}</text>
          {depthMark(origin.x - 30, origin.y, screenDepth(positive, m.view), color)}
        </g>}
      </g>;
    })}
    <circle cx={origin.x} cy={origin.y} r="2.6" fill={chalk} />
    <text x="906" y="667" fill="#adc1de" fontSize="15" className="gpt-svg-label">坐标方向</text>
  </svg>;
};

const GptTrackSurfaces: React.FC<{m: Model; t: number}> = ({m, t}) => {
  const {outer, inner} = t >= 570.44 ? closingCylinders(t) : openingCylinders(t);
  const cue = narrationAt(t);
  const outerGlow = cue?.targets.includes('tubeC') ? cue.weight : 0;
  const innerGlow = cue?.targets.includes('tubeD') ? cue.weight : 0;
  if (!outer && !inner && !outerGlow && !innerGlow) return null;
  const azimuth = Math.atan2(m.view.x, m.view.z);
  const rim = (y: number, r: number, front: boolean) => arcPoints(
    (q) => radial(y, r, azimuth + (front ? -.5 : .5) * Math.PI + q * Math.PI), 36,
  );
  const d = (ps: Vector3[]) => `M ${ps.map((p) => xy(m.project(p))).join(' L ')}`;
  const tracks = [
    {name: 'outer', id: 'tubeC', r: TRACKS.radiusC, color: cobalt, opacity: Math.max(outer, .5 * outerGlow), fill: .19 + .11 * outerGlow, glow: outerGlow},
    {name: 'inner', id: 'tubeD', r: TRACKS.radiusD, color: mint, opacity: Math.max(inner, .5 * innerGlow), fill: .28 + .11 * innerGlow, glow: innerGlow},
  ].filter(({opacity}) => opacity > 0);
  const side = (track: typeof tracks[number], front: boolean) => {
    const {r, color, opacity, fill} = track;
    const left = rim(m.A.y, r, front);
    const right = rim(m.B.y, r, front);
    const contour = d([...left, ...right.slice().reverse()]) + ' Z';
    return <g key={track.name} opacity={opacity} data-narrate={front && track.glow > 0 ? track.id : undefined}>
      {/* Close the two rim semicircles along the generators, without drawing end caps. */}
      <path d={contour} fill={color} fillOpacity={front ? fill : fill * .37} stroke="none" />
      {[left, right].map((arc, i) => <path key={i} d={d(arc)} fill="none" stroke={color} strokeWidth={front ? 1.9 : 1.15} strokeOpacity={front ? .8 : .30} />)}
      {front && [0, left.length - 1].map((i) => <path key={`edge-${i}`} d={d([left[i], right[i]])} fill="none" stroke={color} strokeWidth="1.7" strokeOpacity=".65" />)}
    </g>;
  };
  return <g className="gpt-track-sides">
    <g>{tracks.map((track) => side(track, false))}</g>
    <g>{tracks.slice().reverse().map((track) => side(track, true))}</g>
  </g>;
};

const SlidingVector: React.FC<{t: number; m: Model}> = ({t, m}) => {
  const move = vectorMove(t);
  if (!move || move.opacity <= 0) return null;
  const [a, b] = vectorEnds(move.name, m);
  const projected = vectorProjection(a, b, m.view, m.project);
  if (!projected) return null;
  const {p, q, length, depth} = projected;
  const weight = ease(length, 13, 34);
  const tip = {x: lerp(p.x, q.x, move.progress), y: lerp(p.y, q.y, move.progress)};
  const tail = {x: lerp(p.x, q.x, Math.max(0, move.progress - 60 / Math.max(1, length))), y: lerp(p.y, q.y, Math.max(0, move.progress - 60 / Math.max(1, length)))};
  const dx = (q.x - p.x) / Math.max(1, length);
  const dy = (q.y - p.y) / Math.max(1, length);
  const color = move.name === 'AC' ? cobalt : move.name === 'AD' ? mint : '#ffe390';
  return <g opacity={move.opacity} data-vector={move.name}>
    {weight > 0 && <g opacity={weight}>
      <line x1={tail.x} y1={tail.y} x2={tip.x - 4 * dx} y2={tip.y - 4 * dy} stroke="#111b30" strokeWidth="9" />
      <line x1={tail.x} y1={tail.y} x2={tip.x - 4 * dx} y2={tip.y - 4 * dy} stroke={color} strokeWidth="5" />
      {arrowTip(tip, dx, dy, Math.min(17, length * move.progress), color, true)}
    </g>}
    {weight < 1 && <g opacity={1 - weight}>
      <circle cx={p.x} cy={p.y} r="13" fill="none" stroke={color} strokeWidth="2" />
      <line x1={p.x - 8} y1={p.y - 10} x2={p.x - 19} y2={p.y - 20} stroke={color} strokeWidth="1.5" />
      {depthMark(p.x - 25, p.y - 26, depth, color, 9)}
    </g>}
  </g>;
};

export const GptGeometry: React.FC<{f: GptFrame; m: Model}> = ({f, m}) => {
  const {project, A, B, O, O2, C, D, Dprime} = m;
  const {t, endOn, merged, isAtA, close} = f;
  const accent = narrationAt(t);
  const arrow = vectorMove(t);
  const emphasis = (...keys: (Target | undefined)[]) => accent && keys.some(key => key && accent.targets.includes(key)) ? accent.weight : 0;
  const shownLabels = new Set<EdgeSpoken>();
  const shownPoints = new Set<PointSpoken>();
  const intro = t < 25;
  const projection = t >= 43 && t < 378;
  const bOption = f.chapter.key === 'B';
  const cProof = t >= 388 && t < 465;
  const counterA = t >= 472 && f.chapter.key === 'A';
  const counterD = f.chapter.key === 'D';
  const verdict = f.chapter.key === 'end';
  const correction = correctionAt(t);
  const sectionMotion = ease(t, sectionDemo[0], 208.1) * (1 - ease(t, 223.12, sectionDemo[1]));
  const aoNote = t >= 472.06 && t < 476.02;
  const section = t >= 27;
  const axisWeight = 1 - ease(endOn, .72, .97);
  const worldAxes = worldAxesOpacity(f, m);
  const circle = (y: number, r: number) => arcPoints((a) => radial(y, r, a * 2 * Math.PI), 46);
  const points = (list: Vector3[]) => list.map((p) => xy(project(p))).join(' ');
  const path = (list: Vector3[]) => `M ${list.map((p) => xy(project(p))).join(' L ')}`;
  const segment = (a: Vector3, b: Vector3, stroke: string, width: number, opacity = 1, dash?: string) => {
    const p = project(a);
    const q = project(b);
    return <line x1={p.x} y1={p.y} x2={q.x} y2={q.y} stroke={stroke} strokeWidth={width} opacity={opacity} strokeDasharray={dash} />;
  };
  const tag = (p: Vector3, text: string, color = chalk, dx = 0, dy = -20, opacity = 1, size = 25, key?: Target, glow = emphasis(key)) => {
    const q = project(p);
    if (key && (edgesSpoken as readonly string[]).includes(key) && opacity > .2) shownLabels.add(key as EdgeSpoken);
    const numeric = /^(?:\d+°?|√\d+)$/.test(text);
    const tilt = accent?.effect === 'wiggle' ? 5 * glow * Math.sin(4 * Math.PI * accent.progress) : 0;
    const transform = glow > 0 ? `translate(${q.x + dx} ${q.y + dy - size * .32}) rotate(${tilt}) scale(${1 + .14 * glow}) translate(${-q.x - dx} ${-q.y - dy + size * .32})` : undefined;
    const fill = glow ? `color-mix(in srgb, ${color}, #fff1b1 ${Math.round(58 * glow)}%)` : color;
    return <text x={q.x + dx} y={q.y + dy} fill={fill} transform={transform} data-indicate={glow ? key : undefined} textAnchor="middle" opacity={opacity} fontSize={size} className={`gpt-svg-label${numeric ? ' gpt-numeric' : ''}`}>{text}</text>;
  };
  const dot = (p: Vector3, text: string, color = chalk, dx = 0, dy = -22, opacity = 1, r = 7, keys: PointSpoken[] = [], temporary = false) => {
    const q = project(p);
    const glow = emphasis(...keys);
    const id = keys.find(key => emphasis(key)) ?? keys[0];
    const visible = temporary ? opacity : Math.max(opacity, opacity > .21 ? .95 * glow : 0);
    if (visible > .20) for (const key of keys) shownPoints.add(key);
    const flash = glow && accent?.effect === 'flash' ? accent : undefined;
    return <g opacity={visible} data-narrate={glow && visible > .20 ? id : undefined}>
      {glow > 0 && accent?.effect === 'focus' && <circle cx={q.x} cy={q.y} r={r + lerp(28, 8, accent.progress)} fill="none" stroke="#ffe29c" strokeWidth="2" opacity={.8 * glow} />}
      {flash && <g data-flash={id} stroke="#ffe29c" strokeWidth="2" opacity={flash.weight}>
        {Array.from({length: 8}, (_, i) => {
          const a = (i + .5) * Math.PI / 4;
          const near = r + 5 + 10 * flash.progress;
          const far = near + lerp(4, 9, flash.weight);
          return <line key={i} x1={q.x + near * Math.cos(a)} y1={q.y + near * Math.sin(a)} x2={q.x + far * Math.cos(a)} y2={q.y + far * Math.sin(a)} />;
        })}
      </g>}
      <circle cx={q.x} cy={q.y} r={r + 5 + 3 * glow} fill={color} fillOpacity={.12 + .20 * glow} /><circle cx={q.x} cy={q.y} r={r * (1 + .16 * glow)} fill={color} stroke={glow ? '#f7d98a' : '#091323'} strokeWidth={glow ? 2.5 : 2} />
      {tag(p, text, color, dx, dy, 1, 25, id, glow)}
    </g>;
  };
  const between = (a: Vector3, b: Vector3, q = 0.5) => a.clone().lerp(b, q);
  const shortAxis = (id: 'x' | 'z', endpoint: Vector3, color: string, dx: number, dy: number) => {
    const a = project(A), b = project(endpoint);
    const length = Math.max(1, screenDistance(a,b));
    const weight = emphasis(id);
    const ink = weight ? `color-mix(in srgb, ${color}, #fff1b1 ${Math.round(84 * weight)}%)` : color;
    return <g data-axis-pulse={weight ? id : undefined}>
      {weight > 0 && segment(A,endpoint,ink,9,.24 * weight)}
      {segment(A, endpoint, ink, 1.9 + 2.2 * weight, .84 + .16 * weight)}
      {arrowTip(b,(b.x-a.x)/length,(b.y-a.y)/length,9 + 4 * weight,ink)}
      {tag(endpoint,id,ink,dx,dy,1,22,id)}
    </g>;
  };
  const rightAngle = (center: Vector3, a: Vector3, b: Vector3, size = 0.25, highlight = 0) => {
    const u = a.clone().sub(center).normalize().multiplyScalar(size);
    const w = b.clone().sub(center).normalize().multiplyScalar(size);
    const d = path([center.clone().add(u), center.clone().add(u).add(w), center.clone().add(w)]);
    return <>{highlight > 0 && <path d={d} stroke="#fff1ad" strokeWidth="8" opacity={.40 * highlight} fill="none" />}<path d={d} stroke={amber} strokeWidth="3" fill="none" /></>;
  };
  const angular = (center: Vector3, a: Vector3, b: Vector3, r: number, str: string, dx = 0, dy = 0, key?: Target, reveal = 1) => {
    const u = a.clone().sub(center).normalize();
    const w = b.clone().sub(center).normalize();
    const theta = u.angleTo(w);
    const normal = w.clone().addScaledVector(u, -w.dot(u)).normalize();
    const at = (a: number, radius: number) => center.clone().addScaledVector(u, radius * Math.cos(theta * a)).addScaledVector(normal, radius * Math.sin(theta * a));
    const glow = emphasis(key);
    return <g data-narrate={glow ? key : undefined} opacity={reveal}><path d={path(arcPoints((q) => at(q, r), 20))} stroke={glow ? '#ffe8a5' : amber} strokeWidth={3.2 + 2.1 * glow} fill="none" />{tag(at(.48, r + .23), str, amber, dx, dy, 1, 25, key)}</g>;
  };
  const endOpacity = ease(endOn, 0.7, 0.98);
  const showCPrime = projection && (f.chapter.key !== 'C' || t >= 312);
  const dSide = showCPrime && !merged;
  const screenD = project(D);
  const screenP = project(Dprime);
  const dSeparate = Math.hypot(screenD.x - screenP.x, screenD.y - screenP.y);
  const dVisible = !merged && t >= 43 ? ease(dSeparate, 13, 52) : 1;
  const abPlane = cProof && t >= 439;
  const abdOutline = abPlane ? ease(t, 442.95, 443.28) * (1 - ease(t, 463.9, 465)) : 0;
  const abdFocus = Math.max(emphasis('ABD'),1-ease(t,444.14,445.30));
  const yGlow = emphasis('y');
  const yInk = yGlow ? `color-mix(in srgb, ${axis}, #fff1b1 ${Math.round(86 * yGlow)}%)` : abPlane || f.dView > .48 ? amber : axis;
  const planeEdges = [radial(-.1, -.47, turn), radial(10.2, -.47, turn), radial(10.2, 1.8, turn), radial(-.1, 1.8, turn)];
  const showSectionTriangle = showCPrime || (merged && (bOption || cProof || counterA || counterD));
  const showProjectionLeg = (t >= 107 && t < 151) || (t >= 173 && t < 224) || (t >= 312 && t < 378);
  const showSpaceCd = (bOption || f.chapter.key === 'C' || counterA || counterD) && !(showCPrime && !merged && endOn > .9);
  const cdColor = cProof || counterA || counterD || merged ? coral : chalk;
  const angle60 = t >= 44 && (t < 103 || (t >= 224 && t < 276));
  const angleAtA = (counterA && t >= 513) || (counterD && t >= proofTimes.angleD);
  const fullDrawing = !(intro && t < 10);
  const dPlane = counterD && isAtA ? ease(t, 536, 538) : 0;
  const xOzRect = (y: number) => [v(-2.23,y,-2.23), v(2.23,y,-2.23), v(2.23,y,2.23), v(-2.23,y,2.23)];
  const fillPlane = (vertices: Vector3[], color: string, label: string, anchor: Vector3, intensity: number, id: Target, base = 0, dx = 0, dy = -14) => {
    if (!base && !intensity) return null;
    return <g data-narrate={intensity ? id : undefined}>
      <polygon points={points(vertices)} fill={color} fillOpacity={.07 * base + .12 * intensity} stroke={color} strokeOpacity={.32 * base + .63 * intensity} strokeWidth={1.5 + 1.4 * intensity} />
      {label && tag(anchor, label, color, dx, dy, Math.min(1, .68 * base + intensity), 22, id, intensity)}
    </g>;
  };
  const surfacePulse = () => {
    if (!accent) return null;
    const yz = (p: Vector3, y: number) => v(p.x, y, p.z);
    return <>
      {fillPlane(xOzRect(f.axialC), cobalt, '过 C 的截面', v(-1.25,f.axialC,1.92), !dPlane ? emphasis('sectionC') : 0, 'sectionC')}
      {fillPlane(xOzRect(f.axialD).map(p => v(p.x*.63,p.y,p.z*.63)), mint, '过 D 的截面', v(-.82,f.axialD,1.2), merged ? 0 : emphasis('sectionD'), 'sectionD')}
      {fillPlane(xOzRect(0), mint, dPlane ? 'xOz / 平面 ACD' : 'xOz', v(-1.35,0,2.03), Math.max(emphasis('xOz','ACD'), dPlane ? emphasis('sectionC') : 0), emphasis('ACD') ? 'ACD' : 'xOz', dPlane)}
      {!abPlane && fillPlane(planeEdges, cobalt, '平面 ABD', radial(7.2,1.5,turn), emphasis('ABD'), 'ABD', 0, 24, 30)}
      {fillPlane([A,B,yz(C, B.y),yz(C,A.y)], cobalt, endOn > .9 ? '' : '半平面 ABC', yz(C,7), emphasis('halfC'), 'halfC')}
      {fillPlane([A,B,yz(D, B.y),yz(D,A.y)], mint, endOn > .9 ? '' : '半平面 ABD', yz(D,7), emphasis('halfD'), 'halfD', 0, 28, 26)}
      {fillPlane(counterA || counterD ? [A,C,D] : [O,C,merged ? D : Dprime], coral, '', C, emphasis('triangle'), 'triangle')}
    </>;
  };
  const edgeDefinitions: Record<EdgeSpoken, readonly [Vector3, Vector3, string, string?]> = {
    AB: [A,B,axis], CO1: [C,O,cobalt,'2'], O2D: [O2,D,mint,'1'], O1Dp: [O,Dprime,mint,'1'],
    CDp: [C,Dprime,coral,t >= 74.3 ? '√3' : undefined], DpD: [Dprime,D,amber], CD: [C,D,cdColor,merged ? '√3' : undefined],
    OD: [O,D,mint,merged ? '1' : undefined], AO: [A,O,amber,counterA && Math.abs(O.y - Math.SQRT2) < 1e-6 ? '√2' : undefined],
    AC: [A,C,cobalt,counterA && Math.abs(O.y - Math.SQRT2) < 1e-6 ? '√6' : isAtA ? '2' : undefined],
    AD: [A,D,mint,counterA && Math.abs(O.y - Math.SQRT2) < 1e-6 ? '√3' : isAtA ? '1' : undefined],
  };
  const geometryCorrection = () => {
    if (!correction?.anchor) return null;
    const [a,b] = correction.anchor === 'O' ? [O,O] : correction.anchor === 'sectionC' ? [O,C] : edgeDefinitions[correction.anchor];
    const mid = between(a,b), p = project(mid);
    const labels = [A,B,C,D,O,O2,Dprime].map(project);
    for (const [dx,dy] of [[-65,43],[80,43],[-80,-48],[76,-45]]) {
      const x = p.x+dx, y = p.y+dy;
      if (x < 94 || x > FIELD.w-94 || y < 86 || y > FIELD.h-52 || (x > 824 && y > 487)) continue;
      if (labels.some(q => Math.abs(x-q.x) < 82 && Math.abs(y-q.y) < 36)) continue;
      return <g data-geometry-correction={correction.anchor}>{tag(mid,correction.anchor === 'DpD' ? '口播更正 · D′→D' : '口播更正',amber,dx,dy,1,18)}</g>;
    }
    return null;
  };
  const aliasEdge = (id: EdgeSpoken): EdgeSpoken => {
    if (isAtA && id === 'AC') return 'CO1';
    if (isAtA && id === 'AD') return 'O2D';
    if (merged && id === 'CDp') return 'CD';
    if (merged && (id === 'OD' || id === 'O1Dp')) return 'O2D';
    return id;
  };
  const edgePulse = () => {
    if (!accent) return null;
    const ids = accent.targets.filter((id): id is EdgeSpoken => (edgesSpoken as readonly string[]).includes(id));
    const drawn = new Set<EdgeSpoken>();
    return ids.map(id => {
      const alias = aliasEdge(id);
      if (drawn.has(alias)) return null;
      drawn.add(alias);
      const [a,b,color,metric] = edgeDefinitions[id];
      const p = project(a), q = project(b);
      const len = screenDistance(p,q);
      const arrowOnEdge = !!arrow && aliasEdge(vectorEdges[arrow.name]) === alias;
      if (a.distanceToSquared(b) < 1e-9) {
        return <g key={id} data-narrate={id} opacity={accent.weight}>{tag(a, id === 'DpD' ? 'DD′ = 0' : '共点', amber, -17, -34, 1, 21)}</g>;
      }
      if (len < 16) {
        if (arrowOnEdge) return null;
        return <g key={id} data-narrate={id} opacity={accent.weight}>
          {depthMark(p.x+29,p.y-12,screenDepth(b.clone().sub(a),m.view),amber)}
          {tag(a, edgeLabels[id], amber, 51, -6, 1, 19)}
        </g>;
      }
      const trace = accent.effect === 'trace' && !arrowOnEdge;
      const q0 = Math.max(0, accent.progress*1.24 - .24), q1 = Math.min(1, accent.progress*1.24);
      const middle = between(a,b,.5), mid = project(middle);
      const value = id === 'DpD' && f.board > 0 ? undefined : metric ?? edgeLabels[id];
      const dx = (q.y-p.y) / len * 24, dy = -(q.x-p.x) / len * 25 + 5;
      const inFrame = mid.x+dx > 40 && mid.x+dx < FIELD.w-55 && mid.y+dy > 63 && mid.y+dy < FIELD.h-38;
      return <g key={id} data-narrate={id} data-trace={trace ? id : undefined} opacity={accent.weight}>
        {segment(a,b,color,arrowOnEdge ? 5.4 : 9,arrowOnEdge ? .32 : .31)}
        {segment(trace ? between(a,b,q0) : a, trace ? between(a,b,q1) : b,arrowOnEdge ? color : '#ffe8ad',arrowOnEdge ? 3.6 : 4.5,arrowOnEdge ? .33 : .85)}
        {value && !shownLabels.has(alias) && !shownLabels.has(id) && inFrame && tag(middle,value,color,dx,dy,1,22,id,accent.weight)}
      </g>;
    });
  };
  const pointPulse = () => {
    if (!accent) return null;
    const definitions: Record<PointSpoken, readonly [Vector3,string,string]> = {
      A:[A,'A',amber], B:[B,'B',axis], C:[C,'C',cobalt], D:[D,'D',mint], Dp:[Dprime,'D′',mint], O:[O,'O',chalk], O1:[O,'O₁',chalk], O2:[O2,'O₂',chalk],
    };
    const ids = accent.targets.filter((id): id is PointSpoken => (pointsSpoken as readonly string[]).includes(id));
    return ids.map(id => {
      if (shownPoints.has(id)) return null;
      const [p,label,color] = definitions[id];
      const q = project(p);
      if (q.x < 30 || q.x > FIELD.w-28 || q.y < 50 || q.y > FIELD.h-35) return <g key={id} data-narrate={id} opacity={accent.weight}>{tag(p,label,color,Math.max(38,Math.min(FIELD.w-38,q.x))-q.x,Math.max(73,Math.min(FIELD.h-42,q.y))-q.y,1,22,id)}</g>;
      const overlaps = [...shownPoints].some(other => definitions[other][0].distanceToSquared(p) > 1e-8 && screenDistance(project(definitions[other][0]),q) < 18);
      if (overlaps) {
        return <g key={id} opacity={accent.weight} data-narrate={id}>
          <circle cx={q.x} cy={q.y} r="14" stroke={color} strokeWidth="2" strokeDasharray="3 3" fill="none" />
          {tag(p,`${label}（投影）`,color,-55,-28,1,19,id)}
        </g>;
      }
      return <React.Fragment key={id}>{dot(p,label,color, -12, id === 'O1' || id === 'O2' ? 29 : -24,accent.weight,6,[id],true)}</React.Fragment>;
    });
  };
  return <svg className="gpt-field" width={FIELD.w} height={FIELD.h} viewBox={`0 0 ${FIELD.w} ${FIELD.h}`} aria-hidden="true">
    <defs>
      <pattern id="gpt-dots" width="24" height="24" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1" fill="#789bd7" opacity=".19" /></pattern>
      <radialGradient id="gpt-field-light" cx="52%" cy="44%" r="70%"><stop stopColor="#1b2d4b" /><stop offset="1" stopColor="#0b1526" /></radialGradient>
    </defs>
    <rect x="1" y="1" width={FIELD.w - 2} height={FIELD.h - 2} rx="24" fill="url(#gpt-field-light)" stroke="#29405e" />
    <rect x="2" y="2" width={FIELD.w - 4} height={FIELD.h - 4} rx="24" fill="url(#gpt-dots)" />
    <g strokeLinecap="round" strokeLinejoin="round">
      <GptTrackSurfaces m={m} t={t} />
      {section && <g opacity={verdict ? .56 + .44 * f.review : 1}><path d={path(circle(f.axialC, lerp(2.30, 2.12, close))) + ' Z'} fill="#73a7ff" fillOpacity={endOn > .9 ? .08 : .045} stroke={cobalt} strokeOpacity={.28 + endOn * .16} strokeWidth="1.7" />
        {!merged && ((t >= 32 && t < 378) || verdict) && <path d={path(circle(f.axialD, 1)) + ' Z'} fill="none" stroke={mint} strokeOpacity={.30 * ease(screenDistance(project(O), project(O2)), 19, 85)} strokeWidth="1.4" />}</g>}
      {showSectionTriangle && <polygon points={points([O, C, Dprime])} fill={cobalt} fillOpacity={endOn > .85 ? .14 : .045} />}
      {abPlane && <g opacity={Math.max(ease(t, 438, 442),emphasis('ABD'))} data-narrate={emphasis('ABD') ? 'ABD' : undefined}><polygon points={points(planeEdges)} fill="#588dff" fillOpacity={.20 + .12*emphasis('ABD')} stroke="#769df4" strokeOpacity={.65 + .25*emphasis('ABD')} strokeWidth={1.5 + 1.5*emphasis('ABD')} />{tag(radial(7.2, 1.5, turn), '平面 ABD', cobalt, 24, 30,1,25,'ABD')}</g>}
      {counterA && <polygon points={points([A, C, D])} fill={coral} fillOpacity=".105" />}
      {accent ? surfacePulse() : fillPlane(xOzRect(0),mint,'xOz / 平面 ACD',v(-1.35,0,2.03),0,'xOz',dPlane)}
      {sectionMotion > 0 && <g data-section-demo="true">
        {fillPlane(xOzRect(f.axialC),cobalt,'过 C 的截面',v(-1.28,f.axialC,1.92),0,'sectionC',sectionMotion)}
        {fillPlane(xOzRect(f.axialD),mint,'过 D 的截面',v(-1.28,f.axialD,1.92),0,'sectionD',sectionMotion)}
      </g>}
      {yGlow > 0 && segment(A,B,yInk,10,.24 * yGlow * axisWeight)}
      <g data-axis-pulse={yGlow ? 'y' : undefined} data-abd-edge={abdOutline ? 'AB' : undefined}>
        {segment(A, B, yInk, (abPlane || f.dView > .48 ? 4.1 : 2.5) + Math.max(2.6 * yGlow, abdOutline * abdFocus), axisWeight)}
      </g>
      {abdOutline > 0 && <g data-abd-outline="true" opacity={abdOutline}>
        {ease(t,443.28,443.69) > 0 && <g data-abd-edge="BD">{segment(B,between(B,D,ease(t,443.28,443.69)),cobalt,2.5 + 1.6 * abdFocus,.51 + .44 * abdFocus)}</g>}
        {ease(t,443.69,444.10) > 0 && <g data-abd-edge="DA">{segment(D,between(D,A,ease(t,443.69,444.10)),cobalt,2.5 + 1.6 * abdFocus,.51 + .44 * abdFocus)}</g>}
      </g>}
      {f.dView > 0 && (() => {
        const a = project(A), b = project(B), len = screenDistance(a,b);
        const ux = (b.x-a.x)/Math.max(1,len), uy = (b.y-a.y)/Math.max(1,len);
        return <g opacity={ease(f.dView,.48,.92)}>{arrowTip({x:b.x+22*ux,y:b.y+22*uy},ux,uy,12,amber)}{tag(B,'y',amber,35*ux+4,35*uy+10,1,21,'y')}</g>;
      })()}
      {worldAxes > 0 && <g opacity={worldAxes}>
        {shortAxis('x',v(1.45,0,0),axisX,13,10)}
        {shortAxis('z',v(0,0,1.75),axisZ,0,-11)}
        {(() => {
          const a = project(A);
          const b = project(B);
          const n = screenDistance(a, b);
          const dx = (b.x - a.x) / n;
          const dy = (b.y - a.y) / n;
          return <>{arrowTip({x: b.x + dx * 21, y: b.y + dy * 21}, dx, dy, 11 + 4 * yGlow, yInk)}
            <line x1={b.x} y1={b.y} x2={b.x + dx * 17} y2={b.y + dy * 17} stroke={yInk} strokeWidth={2.5 + 2.6 * yGlow} />
            {tag(B, 'y', yInk, dx * 38, dy * 38 + 7, 1, 22,'y')}</>;
        })()}
      </g>}
      {segment(O, C, cobalt, 3.3)}
      {fullDrawing && segment(O2, D, mint, abPlane ? 5 : 3.25, dVisible)}
      {dSide && segment(O, Dprime, mint, 2.6, .68)}
      {showSpaceCd && segment(C, D, cdColor, 4.4, showCPrime && !merged ? .53 : .96)}
      {showCPrime && !merged && segment(C, Dprime, coral, 4.6)}
      {dSide && showProjectionLeg && segment(Dprime, D, amber, 2.8, .83 * dVisible, '8 7')}
      {dSide && sectionMotion > 0 && <g opacity={sectionMotion}>
        {segment(Dprime,D,amber,2.7,.88)}
        {t < 219.36 && (() => {
          const mid = between(Dprime,D), p = project(mid);
          return <>
            <path d={`M${xy(p)} l38,58 h19`} fill="none" stroke={amber} strokeWidth="1.15" opacity=".53" />
            {tag(mid,'截面距',amber,91,64,.92,19,'DpD')}
          </>;
        })()}
      </g>}
      {dSide && showProjectionLeg && t >= 121 && t < 224 && <g opacity={dVisible} data-narrate={emphasis('rightDp') ? 'rightDp' : undefined}>{rightAngle(Dprime, C, D, .235,emphasis('rightDp'))}</g>}
      {counterA && <g>{segment(A, O, amber, 4, .93)}{segment(A, C, cobalt, 3.5, .88)}{segment(A, D, mint, 4.6)}{t >= 488 && <g data-narrate={emphasis('rightD') ? 'rightD' : undefined}>{rightAngle(D,C,A,.25,emphasis('rightD'))}</g>}</g>}
      {cProof && t >= SECTION_RIGHT_ANGLE_AT && <g data-narrate={emphasis('rightD') ? 'rightD' : undefined}>{rightAngle(D,O,C,.25,emphasis('rightD'))}</g>}
      {(angle60 || emphasis('angleAxis') > 0) && angular(O,C,Dprime,.59,'60°',endOn > .8 ? 4 : -8,endOn > .8 ? -7 : -16,'angleAxis',angle60 ? 1 : emphasis('angleAxis'))}
      {angleAtA && angular(A,C,D,.68,counterA ? '45°' : '60°',-10,-5,'angleA')}
      {t >= 29 && (endOn > .83 || t < 44 || dPlane > 0) && tag(between(O,C,.56),'2',cobalt,-22,0,1,25,'CO1',emphasis('CO1',isAtA ? 'AC' : undefined))}
      {t >= 36 && (endOn > .83 || t < 44 || dPlane > 0) && tag(between(endOn > .83 && !merged ? O : O2,endOn > .83 && !merged ? Dprime : D,.64),'1',mint,endOn > .83 ? 13 : -2,25,1,25,endOn > .83 && !merged ? 'O1Dp' : 'O2D',emphasis(endOn > .83 && !merged ? 'O1Dp' : 'O2D',merged ? 'OD' : undefined,isAtA ? 'AD' : undefined))}
      {t >= 74.3 && (bOption || cProof || (counterA && t >= 488)) && tag(between(C,showCPrime ? Dprime : D),endOn > .86 || merged ? '√3' : 'CD′ = √3',coral,endOn > .86 ? 56 : 25,-12,bOption || t >= 416 ? 1 : 0,27,merged ? 'CD' : 'CDp',emphasis(merged ? 'CD' : 'CDp',merged ? 'CDp' : undefined))}
      {counterA && t >= 488 && tag(between(A,D,.65),'√3',mint,23,25,1,27,'AD')}
      {counterA && t >= 479 && tag(between(A,O,.49),'AO₁ = AO = √2',amber,17,98,1,22,'AO')}
      {edgePulse()}
      {dot(A,isAtA ? (emphasis('O1','O2') ? 'A = O₁ = O₂' : 'A = O') : 'A',amber,isAtA ? -44 : -5,36,isAtA ? 1 : (1-endOpacity),7,isAtA ? ['A','O','O1','O2'] : ['A'])}
      {dot(B,'B',f.dView > .48 ? amber : axis,8,-20,(1-endOpacity)*Math.max(f.dView,1-.98*close),6,['B'])}
      {section && !isAtA && dot(O,merged ? (emphasis('O1','O2') ? 'O₁ = O₂ = O' : 'O') : 'O₁',chalk,endOn > .82 ? -17 : 0,34,verdict ? ease(f.review,.08,.34) : 1,5,merged ? ['O','O1','O2'] : ['O1','O'])}
      {section && !merged && dot(O2,'O₂',axis,-13,35,dVisible * (verdict ? ease(f.review,.16,.45) : 1),5,['O2'])}
      {aoNote && tag(O,'O₁ = O',amber,-52,38,1,18)}
      {dot(C,'C',cobalt,-5,-23,1,9,['C'])}
      {fullDrawing && dot(D,merged && emphasis('Dp') ? 'D = D′' : 'D',mint,12,30,dVisible,9,merged ? ['D','Dp'] : ['D'])}
      {dSide && dot(Dprime,'D′',mint,26,endOn > .7 ? 5 : 23,.6+.4*endOpacity,6,['Dp'])}
      {pointPulse()}
      <SlidingVector t={t} m={m} />
      {geometryCorrection()}
    </g>
  </svg>;
};
