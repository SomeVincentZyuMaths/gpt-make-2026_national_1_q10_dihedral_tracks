import {ease, type GptFrame} from './gptTimeline';
import {vectorMove} from './gptVectorCues';

export const cameraCues = [
  {id: 'equal-section-push', start: 165, end: 170, zoom: .08, pan: 0, yaw: 0, pitch: 0},
  {id: 'shared-section-pan', start: 394, end: 400, zoom: 0, pan: 24, yaw: 0, pitch: 0},
  {id: 'plane-ABD-orbit', start: 440.5, end: 455.8, zoom: 0, pan: 0, yaw: -9, pitch: 14},
] as const;

export function cameraCue(f: GptFrame) {
  if (f.endOn > 0 || f.board > 0 || vectorMove(f.t)) return undefined;
  const cue = cameraCues.find(({start, end}) => start < f.t && f.t < end);
  if (!cue) return undefined;
  const elapsed = (f.t - cue.start) / (cue.end - cue.start);
  return {...cue, weight: ease(elapsed, 0, .42) * (1 - ease(elapsed, .55, 1))};
}

export const SECTION_RIGHT_ANGLE_AT = 429.58;
