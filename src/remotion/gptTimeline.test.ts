import katex from 'katex';
import {describe, expect, it} from 'vitest';
import subs from '../../audio/gpt_voice_subtitles.json';
import {geometryModel} from './GptGeometry';
import {AUDIO_SAMPLES, beats, chapters, FPS, FRAMES, gptFrame} from './gptTimeline';

describe('GPT 真人原声时间轴', () => {
  it('covers the whole AAC stream at 60 fps, with less than one frame of end padding', () => {
    expect(FRAMES).toBe(35289);
    const trailing = FRAMES / FPS - AUDIO_SAMPLES / 44100;
    expect(trailing).toBeGreaterThanOrEqual(0);
    expect(trailing).toBeLessThan(1 / FPS);
    expect(gptFrame(FRAMES / FPS - 1 / FPS).chapter.key).toBe('end');
  });

  it('has integer, non-overlapping cues that end within the master', () => {
    let end = 0;
    for (const cue of subs) {
      expect(Number.isInteger(cue.startMs) && Number.isInteger(cue.endMs)).toBe(true);
      expect(cue.startMs).toBeGreaterThanOrEqual(end);
      expect(cue.endMs).toBeGreaterThan(cue.startMs);
      expect([...cue.text].length).toBeLessThanOrEqual(45);
      end = cue.endMs;
    }
    expect(end).toBeLessThan(AUDIO_SAMPLES * 1000 / 44100);
  });

  it('keeps chapter, board and camera state seekable in any frame order', () => {
    for (const chapter of chapters) expect(gptFrame(chapter.at).chapter.key).toBe(chapter.key);
    for (const t of [517, 0, 312, 573, 84, 432]) {
      const current = gptFrame(t);
      gptFrame(t / 3);
      expect(gptFrame(t)).toEqual(current);
      expect(current.endOn).toBeGreaterThanOrEqual(0);
      expect(current.endOn).toBeLessThanOrEqual(1);
    }
    expect(gptFrame(350).board).toBe(1);
    expect(gptFrame(320).rows).toHaveLength(1);
    expect(gptFrame(397).board).toBe(0);
  });

  it('preserves radii and relative angle while rotating or sliding', () => {
    for (const t of [70, 146, 151, 246, 260, 383, 432, 477, 517, 532, 567]) {
      const {C, D, O, O2, Dprime} = geometryModel(gptFrame(t));
      expect(O.distanceTo(C)).toBeCloseTo(2);
      expect(O2.distanceTo(D)).toBeCloseTo(1);
      expect(C.distanceTo(Dprime)).toBeCloseTo(Math.sqrt(3));
      expect(C.clone().sub(O).angleTo(D.clone().sub(O2))).toBeCloseTo(Math.PI / 3);
    }
    expect(gptFrame(152).merged).toBe(true);
    expect(gptFrame(350).merged).toBe(false);
    expect(gptFrame(390).merged).toBe(true);
    const a = geometryModel(gptFrame(517));
    expect(a.A.distanceTo(a.O)).toBeCloseTo(Math.sqrt(2));
    expect(a.C.clone().sub(a.A).angleTo(a.D.clone().sub(a.A))).toBeCloseTo(Math.PI / 4);
    const d = geometryModel(gptFrame(567));
    expect(d.A.distanceTo(d.O)).toBe(0);
    expect(d.C.dot(d.D)).toBeCloseTo(1);
  });

  it('parses every formula before passing it to the video renderer', () => {
    for (const {rows} of beats) for (const {tex} of rows) {
      expect(katex.renderToString(tex, {throwOnError: true, strict: 'ignore'})).toContain('katex');
    }
  });
});
