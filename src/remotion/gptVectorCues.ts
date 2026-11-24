import {Vector3} from 'three';
import {ease, proofTimes} from './gptTimeline';

export type VectorName = 'AB' | 'CD' | 'CDprime' | 'DprimeD' | 'AC' | 'AD';
type VectorCue = {captionStartMs: number; moves: ReadonlyArray<readonly [VectorName, number]>};

// Absolute seconds on the original voice track. Groups follow the subtitle cues;
// the starts inside each group follow the spoken references, not the caption onset.
export const vectorCues: readonly VectorCue[] = [
  {captionStartMs: 108200, moves: [['CD', 108.48]]},
  {captionStartMs: 115780, moves: [['CD', 115.90], ['CDprime', 117.10], ['DprimeD', 118.60]]},
  {captionStartMs: 136780, moves: [['CDprime', 137.72], ['DprimeD', 139.13]]},
  {captionStartMs: 172600, moves: [['CD', 175.72]]},
  {captionStartMs: 192400, moves: [['CDprime', 193.10]]},
  {captionStartMs: 219360, moves: [['DprimeD', 219.82]]},
  {captionStartMs: 295300, moves: [['AB', 295.58]]},
  {captionStartMs: 300960, moves: [['CD', 304.05]]},
  {captionStartMs: 319140, moves: [['CD', 319.23], ['CDprime', 320.66], ['DprimeD', 322.03]]},
  {captionStartMs: 344540, moves: [['AB', 345.12], ['CD', 350.38]]},
];

export const VECTOR_SECONDS = 1.04;
const proofMoves: readonly (readonly [VectorName, number])[] = [
  ['AB', proofTimes.componentAB], ['CD', proofTimes.componentCD],
  ['AC', proofTimes.vectorAC], ['AD', proofTimes.vectorAD],
];
const moves = [...vectorCues.flatMap(({moves}) => moves), ...proofMoves];

export function vectorMove(t: number) {
  const active = moves.find(([, start]) => t >= start && t < start + VECTOR_SECONDS);
  if (!active) return undefined;
  const [name, start] = active;
  const age = t - start;
  return {name, progress: .10 + .87 * ease(age, .035, .95), opacity: ease(age, 0, .13) * (1 - ease(age, .80, VECTOR_SECONDS))};
}

type PointName = 'A' | 'B' | 'C' | 'D' | 'Dprime';
const endpoints: Record<VectorName, readonly [PointName, PointName]> = {
  AB: ['A', 'B'], CD: ['C', 'D'], CDprime: ['C', 'Dprime'], DprimeD: ['Dprime', 'D'],
  AC: ['A', 'C'], AD: ['A', 'D'],
};

export const vectorEnds = (name: VectorName, model: Record<PointName, Vector3>) => {
  const [start, end] = endpoints[name];
  return [model[start], model[end]] as const;
};
export const screenDepth = (delta: Vector3, towardCamera: Vector3): 'in' | 'out' => delta.dot(towardCamera) > 0 ? 'out' : 'in';

type ScreenPoint = {x: number; y: number};
export function vectorProjection(a: Vector3, b: Vector3, towardCamera: Vector3, project: (p: Vector3) => ScreenPoint) {
  const delta = b.clone().sub(a);
  if (delta.lengthSq() < 1e-12) return undefined;
  const p = project(a);
  const q = project(b);
  const length = Math.hypot(q.x - p.x, q.y - p.y);
  return {p, q, length, depth: screenDepth(delta, towardCamera)};
}
