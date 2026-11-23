import {readFileSync, writeFileSync} from 'node:fs';

const input = new URL('../audio/gpt_voice_subtitles.json', import.meta.url);
const output = new URL('../audio/gpt_voice_subtitles.srt', import.meta.url);
const cues = JSON.parse(readFileSync(input, 'utf8'));
const srtTime = (ms) => new Date(ms).toISOString().slice(11, 23).replace('.', ',');
const nl = String.fromCharCode(10);
const blocks = cues.map(({startMs, endMs, text}, i) =>
  [i + 1, `${srtTime(startMs)} --> ${srtTime(endMs)}`, text].join(nl),
);
writeFileSync(output, blocks.join(nl + nl) + nl, 'utf8');
console.log(`Exported ${cues.length} cues`);
