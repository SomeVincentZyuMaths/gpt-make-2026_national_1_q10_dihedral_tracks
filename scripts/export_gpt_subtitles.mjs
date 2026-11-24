import {readFileSync, writeFileSync} from 'node:fs';

const input = new URL('../audio/gpt_voice_subtitles.json', import.meta.url);
const output = new URL('../audio/gpt_voice_subtitles_edited.srt', import.meta.url);
const edit = JSON.parse(readFileSync(new URL('../src/remotion/gptEdit.json', import.meta.url), 'utf8'));
const cutIn = edit.cutFromFrame * 1000 / edit.fps;
const cutOut = edit.cutToFrame * 1000 / edit.fps;
const translate = (time) => Math.round(time - Math.max(0, Math.min(time - cutIn, cutOut - cutIn)));
const cues = JSON.parse(readFileSync(input, 'utf8')).filter(cue => cue.startMs !== edit.removedCaptionStartMs);
const srtTime = (ms) => new Date(ms).toISOString().slice(11, 23).replace('.', ',');
const nl = String.fromCharCode(10);
const blocks = cues.map(({startMs, endMs, text}, i) =>
  [i + 1, `${srtTime(translate(startMs))} --> ${srtTime(translate(endMs))}`, text].join(nl),
);
writeFileSync(output, blocks.join(nl + nl) + nl, 'utf8');
console.log(`Exported ${cues.length} cues`);
