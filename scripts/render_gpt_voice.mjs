import {spawnSync} from 'node:child_process';
import {existsSync, mkdirSync, mkdtempSync, readFileSync, renameSync, writeFileSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {bundle} from '@remotion/bundler';
import {openBrowser, renderMedia, renderStill, selectComposition} from '@remotion/renderer';

const repo = fileURLToPath(new URL('..', import.meta.url));
const edit = JSON.parse(readFileSync(new URL('../src/remotion/gptEdit.json', import.meta.url), 'utf8'));
const samplesPerFrame = edit.sampleRate / edit.fps;
const cutFrames = edit.cutToFrame - edit.cutFromFrame;
const editedSamples = edit.masterSamples - cutFrames * samplesPerFrame;
const editedFrameAt = (sourceSeconds) => {
  const frame = Math.round(sourceSeconds * edit.fps);
  if (frame >= edit.cutFromFrame && frame < edit.cutToFrame) throw new Error('Preview anchor is inside the removed sentence.');
  return frame - (frame >= edit.cutToFrame ? cutFrames : 0);
};
const series = 'gpt-make-2026_q10_dihedral_tracks_realvoice_60fps';
const source = path.resolve(process.env.GPT_VOICE_SOURCE ?? path.join(repo, '../2026_national_1_q10_dihedral_tracks/video/archive/gemini处理-字幕版.mp4'));
const tempRoot = path.resolve(process.env.GPT_VOICE_TEMP ?? path.join(process.platform === 'win32' ? 'D:/temp/codex' : os.tmpdir(), 'gpt-make-2026_national_1_q10_dihedral_tracks'));
const outputDir = path.join(repo, 'video', 'archive');
const browserExecutable = process.env.GPT_VOICE_CHROME || undefined;
const modes = ['stills', 'samples', 'full'];
const mode = process.argv[2];
if (!modes.includes(mode)) throw new Error(`Usage: node scripts/render_gpt_voice.mjs ${modes.join('|')}`);
if (mode !== 'stills' && !existsSync(source)) throw new Error(`Missing source video: ${source}`);
mkdirSync(tempRoot, {recursive: true});
const resume = process.env.GPT_VOICE_RESUME;
if (resume && (mode !== 'full' || !/^full-[a-zA-Z0-9]+$/.test(resume))) throw new Error('GPT_VOICE_RESUME must be a full job directory name.');
const job = resume ? path.join(tempRoot, resume) : mkdtempSync(path.join(tempRoot, `${mode}-`));
const checkpoint = path.join(job, 'checkpoint.json');
if (resume && !existsSync(checkpoint)) throw new Error(`No render checkpoint at ${checkpoint}`);
Object.assign(process.env, {TEMP: job, TMP: job, TMPDIR: job});
console.log(`Work directory: ${job}`);

function freshOutput() {
  const date = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  });
  const {year, month, day, hour, minute} = Object.fromEntries(date.formatToParts(new Date()).map(({type, value}) => [type, value]));
  const stem = `${series}_narration_polish_${year}${month}${day}-${hour}${minute}`;
  for (let n = 1; ; n++) {
    const suffix = n === 1 ? '' : `-${String(n).padStart(2, '0')}`;
    const output = path.join(outputDir, `${stem}${suffix}.mp4`);
    if (!existsSync(output)) return output; // ffmpeg -n also protects concurrent deliveries.
  }
}

function run(command, args, capture = false) {
  const result = spawnSync(command, args, {encoding: 'utf8', stdio: capture ? ['ignore', 'pipe', 'inherit'] : ['ignore', 'inherit', 'inherit']});
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} exited with ${result.status}`);
  return result.stdout?.trim();
}
const probe = (file) => JSON.parse(run('ffprobe', ['-v', 'error', '-show_format', '-show_streams', '-of', 'json', file], true));
const hashAudio = (file) => run('ffmpeg', ['-v', 'error', '-i', file, '-map', '0:a:0', '-c:a', 'copy', '-f', 'hash', '-hash', 'sha256', '-'], true);

const serveUrl = resume ? path.join(job, 'bundle') : await bundle({entryPoint: path.join(repo, 'src/remotion/index.ts'), outDir: path.join(job, 'bundle'), enableCaching: false, onProgress: (p) => { if (p === 100) console.log('Bundle ready'); }});
const browser = await openBrowser('chrome', {browserExecutable, logLevel: 'warn'});
try {
  const composition = await selectComposition({id: 'GptRealVoice', serveUrl, puppeteerInstance: browser, logLevel: 'warn'});
  const {fps, durationInFrames} = composition;
  if (mode === 'stills') {
    const stills = [
      ['opening-cylinders', 28.50], ['axis-x', 33.26], ['axis-y', 33.82], ['axis-z', 34.60],
      ['cut-before', (edit.cutFromFrame - 1) / fps], ['cut-after', edit.cutToFrame / fps],
      ['plane-correction', 185.8], ['section-near', 213.44], ['section-far', 216.54], ['spoken-correction', 220.22],
      ['component-correction', 337.8],
      ['ABD-outline', 444.25], ['ABD-and-OD', 456.63], ['A-O1-caption', 475.50], ['A-O1-settled', 479.6],
      ['D-finished-proof', 569.26], ['closing-transition', 571.9], ['closing-source', 574.2],
      ['last-frame', (durationInFrames - 1 + cutFrames) / fps],
    ];
    for (const [name, sec] of stills) {
      if (process.env.GPT_VOICE_STILLS && !process.env.GPT_VOICE_STILLS.split(',').includes(name)) continue;
      const output = path.join(job, `${name}.png`);
      await renderStill({composition, serveUrl, puppeteerInstance: browser, frame: editedFrameAt(sec), output, imageFormat: 'png', logLevel: 'warn'});
      console.log(output);
    }
  } else {
    const master = probe(source).streams.find((s) => s.codec_type === 'audio');
    if (master?.codec_name !== 'aac' || Number(master.start_time) !== 0 || Number(master.sample_rate) !== edit.sampleRate || master.channels !== 2 || Math.round(Number(master.duration) * edit.sampleRate) !== edit.masterSamples || durationInFrames !== Math.ceil(editedSamples / samplesPerFrame)) {
      throw new Error('Master audio timing/codec does not match the composition. Update the composition before rendering.');
    }
    const masterSha = hashAudio(source);
    const audio = path.join(job, 'voice.m4a');
    const state = {schema: 2, fps, durationInFrames, masterSha, edit};
    if (!resume) {
      const start = edit.cutFromFrame * samplesPerFrame;
      const end = edit.cutToFrame * samplesPerFrame;
      // The source AAC decoder can end slightly before the container duration.
      // Pad only at the end of the edited track, never across the cut.
      const trim = `[0:a]asplit[head][tail];[head]atrim=end_sample=${start},asetpts=N/SR/TB[a];[tail]atrim=start_sample=${end}:end_sample=${edit.masterSamples},asetpts=N/SR/TB[b];[a][b]concat=n=2:v=0:a=1,apad=whole_len=${editedSamples},atrim=end_sample=${editedSamples},asetpts=N/SR/TB[voice]`;
      run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-n', '-i', source, '-filter_complex', trim, '-map', '[voice]', '-c:a', 'aac', '-b:a', '320k', '-ar', String(edit.sampleRate), '-movie_timescale', String(edit.sampleRate), audio]);
    }
    const editedTrack = probe(audio).streams.find((s) => s.codec_type === 'audio');
    if (editedTrack?.codec_name !== 'aac' || editedTrack.time_base !== `1/${edit.sampleRate}` || Number(editedTrack.duration_ts) !== editedSamples || Number(editedTrack.start_time) !== 0) throw new Error('Edited audio does not have the expected exact sample length.');
    const editedSha = hashAudio(audio);
    const snapshot = JSON.stringify({...state, editedSha});
    if (resume && readFileSync(checkpoint, 'utf8') !== snapshot) throw new Error('Checkpoint does not match the master, edit, or composition.');
    if (!resume && mode === 'full') writeFileSync(checkpoint, snapshot, {flag: 'wx'});
    const previews = path.join(job, 'previews');
    mkdirSync(mode === 'full' ? outputDir : previews, {recursive: true});
    const ranges = mode === 'full' ? [['full', 0, durationInFrames - 1]] : [
      ['axes', 32.6, 35], ['narration-cut', 96.5, 102.6], ['section-motion-and-slip', 207, 224],
      ['ABD-outline', 442, 446], ['AO1-caption', 472, 480], ['original-cylinders', 569.3, 576],
    ].filter(([name]) => !process.env.GPT_VOICE_SAMPLES || process.env.GPT_VOICE_SAMPLES.split(',').includes(name))
      .map(([name, start, end]) => [name, editedFrameAt(start), editedFrameAt(end) - 1]);
    const assertVideo = (file, frames) => {
      const video = probe(file).streams.find((s) => s.codec_type === 'video');
      if (video?.width !== 1920 || video.height !== 1080 || video.avg_frame_rate !== '60/1' || Number(video.nb_frames) !== frames || Math.abs(Number(video.duration) - frames / fps) > 0.00001) {
        throw new Error(`Unexpected video properties: ${file}`);
      }
    };
    const renderRange = async (name, from, to, tempVideo) => {
      const total = to - from + 1;
      const started = Date.now();
      let lastLog = 0;
      await renderMedia({
        composition, serveUrl, puppeteerInstance: browser,
        codec: 'h264', pixelFormat: 'yuv420p', colorSpace: 'bt709', imageFormat: 'jpeg', jpegQuality: 96,
        x264Preset: 'veryfast', crf: 17, muted: true, frameRange: [from, to], outputLocation: tempVideo,
        concurrency: Number(process.env.GPT_VOICE_CONCURRENCY || 4), logLevel: 'warn',
        onProgress: ({renderedFrames, encodedFrames}) => {
          const now = Date.now();
          if (now - lastLog >= 12000 || (encodedFrames === total && lastLog < now - 500)) {
            lastLog = now;
            const global = mode === 'full' ? ` · total ${from + renderedFrames}/${durationInFrames}` : '';
            console.log(`${name}: ${renderedFrames}/${total} rendered, ${encodedFrames} encoded (${((now - started) / 1000).toFixed(0)}s)${global}`);
          }
        },
      });
      assertVideo(tempVideo, total);
    };
    for (const [name, from, to] of ranges) {
      const attempt = mkdtempSync(path.join(job, 'encode-'));
      const tempVideo = path.join(attempt, `${name}-silent.mp4`);
      const total = to - from + 1;
      if (mode === 'full') {
        // Whole-minute boundaries use an exact duration when fast-splicing. The
        // original voice is muxed only once, so chapter boundaries never cut it.
        const step = fps * 60;
        const files = [];
        for (let first = from; first <= to; first += step) {
          const end = Math.min(to, first + step - 1);
          const part = `part-${String(first).padStart(6, '0')}.mp4`;
          const saved = path.join(job, part);
          if (existsSync(saved)) {
            assertVideo(saved, end - first + 1);
            console.log(`Reusing ${part} · total ${end + 1}/${durationInFrames}`);
          } else {
            const candidate = path.join(attempt, part);
            await renderRange(part, first, end, candidate);
            renameSync(candidate, saved);
          }
          files.push(`file '${part}'\nduration ${(end - first + 1) / fps}\n`);
        }
        const index = path.join(job, 'parts.ffconcat');
        writeFileSync(index, 'ffconcat version 1.0\n' + files.join(''));
        run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-n', '-f', 'concat', '-safe', '1', '-i', index, '-map', '0:v:0', '-c', 'copy', tempVideo]);
        assertVideo(tempVideo, total);
      } else {
        await renderRange(name, from, to, tempVideo);
      }
      const muxed = path.join(attempt, `${name}-muxed.mp4`);
      const audioInput = mode === 'full' ? ['-i', audio] : ['-ss', String(from / fps), '-t', String(total / fps), '-i', audio];
      run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-n', '-i', tempVideo, ...audioInput, '-map', '0:v:0', '-map', '1:a:0', '-c', 'copy', '-movie_timescale', String(edit.sampleRate), '-movflags', '+faststart', muxed]);
      const inspected = probe(muxed);
      const videoTrack = inspected.streams.find((s) => s.codec_type === 'video');
      const audioTrack = inspected.streams.find((s) => s.codec_type === 'audio');
      if (videoTrack?.width !== 1920 || videoTrack?.height !== 1080 || videoTrack?.avg_frame_rate !== '60/1' || Number(videoTrack?.nb_frames) !== total || audioTrack?.codec_name !== 'aac') {
        throw new Error('Unexpected encoded output properties.');
      }
      if (mode === 'full' && (editedSha !== hashAudio(muxed) || Number(audioTrack.duration_ts) !== editedSamples)) {
        throw new Error('Muxed audio differs from the verified edit.');
      }
      const output = mode === 'full' ? freshOutput() : path.join(previews, `${name}.mp4`);
      run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-n', '-i', muxed, '-map', '0', '-c', 'copy', '-movie_timescale', String(edit.sampleRate), '-movflags', '+faststart', output]);
      if (mode === 'full') {
        const manifest = probe(output);
        const outputSha256 = hashAudio(output);
        if (editedSha !== outputSha256 || Number(manifest.streams.find((s) => s.codec_type === 'audio')?.duration_ts) !== editedSamples) throw new Error('Final file audio no longer matches the verified edit.');
        writeFileSync(path.join(job, 'verification.json'), JSON.stringify({masterSha256:masterSha, editedSha256:editedSha, outputSha256, editedSamples, output: manifest}, null, 2));
      }
      console.log(`Verified: ${output}`);
    }
  }
} finally {
  await browser.close({silent: true});
}
