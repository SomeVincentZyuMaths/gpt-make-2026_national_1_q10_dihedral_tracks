import katex from 'katex';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {Vector3} from 'three';
import {describe, expect, it} from 'vitest';
import subs from '../../audio/gpt_voice_subtitles.json';
import {geometryModel, GptCompass, GptGeometry, worldAxesOpacity} from './GptGeometry';
import {cameraCue, cameraCues} from './gptMotionCues';
import {narrationAt, narrationClauses, narrationEvents} from './gptNarrationCues';
import {correctionAt} from './gptCorrections';
import edit from './gptEdit.json';
import {GptProblemBar, problemOptions} from './GptProblemBar';
import {AUDIO_SAMPLES, beats, CHAPTER_GAP, CHAPTER_MIN, CHAPTER_SPAN, chapters, chapterWidths, closingCylinders, FPS, FRAMES, gptFrame, openingCylinders, playbackTimeAt, proofTimes, sourceFrameAt} from './gptTimeline';
import {screenDepth, VECTOR_SECONDS, vectorCues, vectorEnds, vectorMove, vectorProjection} from './gptVectorCues';

describe('GPT 真人原声时间轴', () => {
  it('shows one complete, neutral question at the start, during proof and on the last frame', () => {
    for (const [t, clock] of [[0, '00:00'], [322.5, '05:22'], [(FRAMES - 1) / FPS, '09:46']] as const) {
      const html = renderToStaticMarkup(createElement(GptProblemBar, {t}));
      expect(html).toContain(`${clock} / 09:46`);
      expect(html).toContain('A、B 为定点');
      expect(html).toContain('C–AB–D');
      expect([...html.matchAll(/class="gpt-problem-option"/g)]).toHaveLength(4);
      for (const [, text] of problemOptions) expect(html).toContain(text);
      expect(html).not.toMatch(/class="correct"|正确选项|反例/);
    }
  });

  it('keeps camera accents seekable, smooth and separate from mathematical motion', () => {
    const pointKeys = ['A', 'B', 'O', 'O2', 'C', 'D', 'Dprime'] as const;
    for (const cue of cameraCues) {
      const midpoint = (cue.start + cue.end) / 2;
      expect(cameraCue(gptFrame(midpoint))?.weight).toBe(1);
      expect(cameraCue(gptFrame(cue.start))).toBeUndefined();
      expect(cameraCue(gptFrame(cue.end))).toBeUndefined();
      const f0 = gptFrame(cue.start);
      let previous = geometryModel(f0);
      for (let n = Math.ceil(cue.start * FPS); n < cue.end * FPS; n++) {
        const f = gptFrame(n / FPS);
        expect([f.endOn, f.board, f.axialC, f.axialD, f.angle]).toEqual([0, 0, f0.axialC, f0.axialD, f0.angle]);
        expect(vectorMove(f.t)).toBeUndefined();
        const m = geometryModel(f);
        for (const key of pointKeys) {
          expect(m[key]).toEqual(previous[key]);
          const p = m.project(m[key]);
          const q = previous.project(previous[key]);
          expect(Math.hypot(p.x - q.x, p.y - q.y)).toBeLessThan(1.5);
        }
        previous = m;
      }
      const f = gptFrame(midpoint);
      const move = geometryModel(f);
      const rest = geometryModel(f, false);
      expect(move.project(move.C)).not.toEqual(rest.project(rest.C));
      expect(move.project(move.C)).toEqual(geometryModel(f).project(move.C));
      if (cue.pan) {
        const a = move.project(move.C);
        const b = rest.project(rest.C);
        expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeLessThanOrEqual(24.00001);
      }
    }
    for (const t of [67, 84, 319.7, 322.6, 428.95, 432, 545]) {
      const f = gptFrame(t);
      expect(geometryModel(f).view).toEqual(geometryModel(f, false).view);
      expect(cameraCue(f)).toBeUndefined();
    }
  });

  it('maps each caption, gives reasons for narration without a target, and never spills an accent into the next phrase', () => {
    expect(narrationClauses.map(([ms]) => ms)).toEqual(subs.map(s => s.startMs));
    expect(narrationEvents.length).toBeGreaterThan(200);
    const ends = new Map(subs.map(s => [s.startMs, s.endMs / 1000]));
    for (const [i, cue] of narrationEvents.entries()) {
      expect(cue.start, cue.spokenReference).toBeGreaterThanOrEqual(cue.captionStartMs / 1000);
      expect(cue.end, cue.spokenReference).toBeGreaterThan(cue.start);
      expect(cue.end, cue.spokenReference).toBeLessThanOrEqual(Math.min(ends.get(cue.captionStartMs)!, narrationEvents[i + 1]?.start ?? Infinity));
      expect(narrationAt(cue.start + .43 * (cue.end - cue.start))?.targets).toEqual(cue.targets);
      expect(narrationAt(cue.end)?.start).not.toBe(cue.start);
    }
  });

  it('indicates the two endpoint pairs before their lengths, and temporarily reveals a named plane', () => {
    const draw = (t: number) => {
      const f = gptFrame(t);
      return renderToStaticMarkup(createElement(GptGeometry, {f, m: geometryModel(f)}));
    };
    for (const [time, targets] of [[72.20, ['C','O1']], [73.05, ['CO1']], [73.62, ['O1','Dp']], [74.19, ['O1Dp']], [405.2, ['ABD']]] as const) {
      for (const target of targets) expect(draw(time), `${time}: ${target}`).toContain(`data-narrate="${target}"`);
    }
    expect(draw(405.8)).not.toContain('data-narrate="ABD"');
    expect(draw(456.6)).toContain('data-trace="OD"');
    expect(draw(562.99)).not.toContain('data-trace="AC"');
  });

  it('uses duration-proportional chapter widths except for the smallest title, and finishes at 100%', () => {
    const widths = chapterWidths();
    expect(widths.reduce((a,b) => a+b, 0) + CHAPTER_GAP * 5).toBeCloseTo(CHAPTER_SPAN);
    expect(widths.map(w => Math.round(w))).toEqual([180,616,509,161,136,104]);
    expect(widths.at(-1)).toBe(CHAPTER_MIN);
    for (const {at} of chapters) expect(gptFrame(at).chapterProgress).toBe(0);
    expect(gptFrame(sourceFrameAt(FRAMES - 1) / FPS).chapterProgress).toBeCloseTo(1, 12);
  });
  it('covers the whole AAC stream at 60 fps, with less than one frame of end padding', () => {
    expect(FRAMES).toBe(35183);
    expect(AUDIO_SAMPLES).toBe(25_859_020);
    const trailing = FRAMES / FPS - AUDIO_SAMPLES / 44100;
    expect(trailing).toBeGreaterThanOrEqual(0);
    expect(trailing).toBeLessThan(1 / FPS);
    expect(gptFrame(sourceFrameAt(FRAMES - 1) / FPS).chapter.key).toBe('end');
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
    expect(end).toBeLessThan(edit.masterSamples * 1000 / edit.sampleRate);
    expect(playbackTimeAt(end / 1000)).toBeLessThan(AUDIO_SAMPLES / edit.sampleRate);
  });

  it('splices exactly one line and rejoins on an original video frame', () => {
    const cut = edit.cutFromFrame;
    expect(sourceFrameAt(cut - 1)).toBe(cut - 1);
    expect(sourceFrameAt(cut)).toBe(edit.cutToFrame);
    expect(playbackTimeAt(sourceFrameAt(cut) / FPS)).toBeCloseTo(cut / FPS, 12);
    expect(gptFrame((cut-1)/FPS).caption).toBe('');
    expect(gptFrame(98.4).caption).toBe('');
    expect(gptFrame(sourceFrameAt(cut)/FPS).caption).toBe('');
    expect(gptFrame(100.8).caption).toContain('我们严谨地讲一下');
  });

  it('keeps both moving sections parallel while their distance shrinks, expands, and shrinks again', () => {
    const distance = (t: number) => gptFrame(t).axialC - gptFrame(t).axialD;
    expect(gptFrame(208.1).axialC).toBe(gptFrame(211.36).axialC);
    expect(distance(213.44)).toBeLessThan(distance(211.36));
    expect(distance(216.54)).toBeGreaterThan(distance(213.44));
    expect(distance(219.36)).toBeLessThan(distance(216.54));
    expect(distance(222.9)).toBe(distance(219.36));
    expect(distance(225)).toBeCloseTo(distance(206));
    for (let n = 207 * FPS; n <= 225 * FPS; n += 5) {
      const f = gptFrame(n / FPS);
      const {C,D,O,O2,Dprime,view} = geometryModel(f);
      expect(C.y).toBeGreaterThan(D.y);
      expect(C.y).toBe(Dprime.y);
      expect(C.distanceTo(Dprime)).toBeCloseTo(Math.sqrt(3));
      expect(C.clone().sub(O).angleTo(D.clone().sub(O2))).toBeCloseTo(Math.PI / 3);
      expect(view).toEqual(geometryModel(gptFrame(206)).view);
    }
  });

  it('renders the actual axes, ABD sides, the cofoot clarification, and the verified correction', () => {
    const draw = (t: number) => {
      const f = gptFrame(t);
      return renderToStaticMarkup(createElement(GptGeometry, {f, m:geometryModel(f)}));
    };
    for (const [t, axis] of [[33.25,'x'],[33.8,'y'],[34.6,'z']] as const) {
      expect(draw(t)).toContain(`data-axis-pulse="${axis}"`);
      expect(draw(t)).toContain(`data-indicate="${axis}"`);
    }
    expect(draw(442)).not.toContain('data-abd-edge=');
    expect(draw(443.45)).toContain('data-abd-edge="BD"');
    expect(draw(443.45)).not.toContain('data-abd-edge="DA"');
    for (const side of ['AB','BD','DA']) expect(draw(445)).toContain(`data-abd-edge="${side}"`);
    expect(draw(465)).not.toContain('data-abd-edge=');
    expect(gptFrame(475.5).caption).toContain('AO₁');
    expect(draw(475.5)).toContain('O₁ = O');
    expect(draw(475.5)).not.toContain('AO₁ = AO = √2');
    expect(draw(479.6)).toContain('AO₁ = AO = √2');
    expect(correctionAt(185.8)?.text).toContain('与 xOz 平行');
    expect(correctionAt(220)?.text).toContain('D′→D');
    expect(correctionAt(337.8)?.text).toContain('CD 的 x、z 分量');
    expect(correctionAt(340)).toBeUndefined();
    expect(correctionAt(475.5)).toBeUndefined();
    const m = geometryModel(gptFrame(220));
    expect(vectorEnds('DprimeD',m)).toEqual([m.Dprime,m.D]);
  });

  it('returns from D to the opening camera and tracks when the source is spoken', () => {
    expect(closingCylinders(569.26)).toEqual({outer:0,inner:0});
    const opening = geometryModel(gptFrame(28.5));
    const f = gptFrame(574.2), closing = geometryModel(f);
    expect(f.caption).toContain('全国Ⅰ卷');
    expect(closingCylinders(f.t)).toEqual({outer:1,inner:1});
    for (const key of ['A','B','C','D','O','O2'] as const) {
      expect(closing[key]).toEqual(opening[key]);
      expect(closing.project(closing[key])).toEqual(opening.project(opening[key]));
    }
    const html = renderToStaticMarkup(createElement(GptGeometry,{f,m:closing}));
    expect(html).toContain('gpt-track-sides');
    expect(html).not.toContain('平面 ACD');
    expect(html).not.toContain('A = O');
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
    expect(gptFrame(567)).toMatchObject({endOn: 0, dView: 1});
    expect(d.view.y).toBeLessThan(-.9);
    expect(d.view.x).toBeLessThan(-.25);
    const [aScreen, bScreen, dScreen] = [d.A,d.B,d.D].map(d.project);
    expect(bScreen.x).toBeLessThan(aScreen.x - 100);
    expect(dScreen.x).toBeGreaterThan(aScreen.x + 50);
    expect(vectorEnds('AC', d)).toEqual([d.A, d.C]);
    expect(vectorEnds('AD', d)).toEqual([d.A, d.D]);
    expect(d.C.z).toBeCloseTo(2);
    expect(d.D.x).toBeCloseTo(Math.sqrt(3) / 2);
    expect(d.D.z).toBeCloseTo(.5);
    expect(vectorMove(proofTimes.vectorAC + .3)?.name).toBe('AC');
    expect(vectorMove(proofTimes.vectorAD + .3)?.name).toBe('AD');
  });

  it('parses every formula before passing it to the video renderer', () => {
    for (const {rows} of beats) for (const {tex} of rows) {
      expect(katex.renderToString(tex, {throwOnError: true, strict: 'ignore'})).toContain('katex');
    }
  });

  it('times vector movements within every relevant caption, with no overlapping cues', () => {
    const captions = subs.filter((s) => s.text.includes('向量'));
    expect(vectorCues.map((x) => x.captionStartMs)).toEqual(captions.map((x) => x.startMs));
    let previousEnd = -1;
    for (const [index, group] of vectorCues.entries()) {
      for (const [name, start] of group.moves) {
        expect(start).toBeGreaterThanOrEqual(Math.max(previousEnd, captions[index].startMs / 1000));
        expect(start + VECTOR_SECONDS).toBeLessThanOrEqual(captions[index].endMs / 1000);
        previousEnd = start + VECTOR_SECONDS;
        const early = vectorMove(start + .2);
        const late = vectorMove(start + .78);
        expect(late?.name).toBe(name);
        expect(late!.progress).toBeGreaterThan(early!.progress);
        expect(vectorMove(start + .2)).toEqual(early);
        expect(vectorMove(start + 1)!.opacity).toBeLessThan(early!.opacity);
      }
    }
    expect(vectorMove(298)).toBeUndefined();
  });

  it('traverses AB and the three decomposition vectors in their mathematical directions', () => {
    const m = geometryModel(gptFrame(320));
    expect(vectorEnds('AB', m)).toEqual([m.A, m.B]);
    const chain = vectorCues.find(({captionStartMs}) => captionStartMs === 319140)!.moves;
    const endpoints = chain.map(([name]) => vectorEnds(name, m));
    expect(endpoints).toEqual([[m.C, m.D], [m.C, m.Dprime], [m.Dprime, m.D]]);
    const [[c, d], [a, b], [e, f]] = endpoints;
    expect(b.clone().sub(a).add(f.clone().sub(e)).distanceTo(d.clone().sub(c))).toBeCloseTo(0);
  });

  it('keeps the compass visible independently from the axes at A, and distinguishes depth from a zero vector', () => {
    const oblique = gptFrame(299);
    const near = gptFrame(514);
    const endOn = gptFrame(68.1);
    const m = geometryModel(endOn);
    expect(worldAxesOpacity(oblique, geometryModel(oblique))).toBeGreaterThan(.9);
    expect(worldAxesOpacity(near, geometryModel(near))).toBe(0);
    expect(worldAxesOpacity(endOn, m)).toBe(0);
    for (const frame of [gptFrame(0), oblique, near, endOn, gptFrame(577)]) {
      const html = renderToStaticMarkup(createElement(GptCompass, {m: geometryModel(frame)}));
      expect(html).toContain('class="gpt-compass"');
      expect(html).toContain('left:1605px;top:673px');
      expect(html).toContain('坐标方向');
    }
    expect(screenDepth(new Vector3(0, 1, 0), m.view)).toBe('in');
    expect(vectorProjection(m.A, m.B, m.view, m.project)?.length).toBeCloseTo(0);
    expect(vectorProjection(m.B, m.A, m.view, m.project)?.depth).toBe('out');
    const merged = geometryModel(gptFrame(157));
    expect(vectorProjection(merged.Dprime, merged.D, merged.view, merged.project)).toBeUndefined();
  });

  it('reveals the opening surfaces in spoken order, holds both, and removes them before the proof', () => {
    expect(openingCylinders(17)).toEqual({outer: 0, inner: 0});
    expect(openingCylinders(20)).toEqual({outer: 1, inner: 0});
    expect(openingCylinders(24).inner).toBeGreaterThan(0);
    expect(openingCylinders(24).inner).toBeLessThan(1);
    const recap = subs.find(({text}) => text.includes('大圆柱和一个小圆柱'))!;
    expect(openingCylinders(recap.endMs / 1000 + 7)).toEqual({outer: 1, inner: 1});
    expect(openingCylinders(35).outer).toBeLessThan(1);
    expect(openingCylinders(recap.endMs / 1000 + 8.5)).toEqual({outer: 0, inner: 0});
    const draw = (t: number) => {
      const f = gptFrame(t);
      return renderToStaticMarkup(createElement(GptGeometry, {f, m: geometryModel(f)}));
    };
    expect(draw(26)).toContain('class="gpt-track-sides"');
    expect(draw(36)).not.toContain('class="gpt-track-sides"');
    expect(draw(300)).not.toContain('class="gpt-track-sides"');
  });
});
