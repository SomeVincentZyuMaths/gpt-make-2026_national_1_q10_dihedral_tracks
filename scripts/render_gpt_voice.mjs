import {spawnSync} from 'node:child_process';
import {existsSync, mkdirSync, mkdtempSync, writeFileSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {bundle} from '@remotion/bundler';
import {openBrowser, renderMedia, renderStill, selectComposition} from '@remotion/renderer';

const repo = fileURLToPath(new URL('..', import.meta.url));
const series = 'gpt-make-2026_q10_dihedral_tracks_realvoice_60fps';
const source = path.resolve(process.env.GPT_VOICE_SOURCE ?? path.join(repo, '../2026_national_1_q10_dihedral_tracks/video/archive/gemini处理-字幕版.mp4'));
const tempRoot = path.resolve(process.env.GPT_VOICE_TEMP ?? path.join(os.tmpdir(), 'gpt-make-2026_national_1_q10_dihedral_tracks'));
const outputDir = path.join(repo, 'video', 'archive');
const browserExecutable = process.env.GPT_VOICE_CHROME || undefined;
const modes = ['stills', 'samples', 'full'];
const mode = process.argv[2];
if (!modes.includes(mode)) throw new Error(`Usage: node scripts/render_gpt_voice.mjs ${modes.join('|')}`);
if (mode !== 'stills' && !existsSync(source)) throw new Error(`Missing source video: ${source}`);
const fullOutput = path.join(outputDir, `${series}.mp4`);
if (mode === 'full' && existsSync(fullOutput)) throw new Error(`Existing deliverable will not be overwritten: ${fullOutput}`);
mkdirSync(tempRoot, {recursive: true});
const job = mkdtempSync(path.join(tempRoot, `${mode}-`));
Object.assign(process.env, {TEMP: job, TMP: job, TMPDIR: job});
console.log(`Work directory: ${job}`);

function run(command, args, capture = false) {
  const result = spawnSync(command, args, {encoding: 'utf8', stdio: capture ? ['ignore', 'pipe', 'inherit'] : ['ignore', 'inherit', 'inherit']});
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} exited with ${result.status}`);
  return result.stdout?.trim();
}
const probe = (file) => JSON.parse(run('ffprobe', ['-v', 'error', '-show_format', '-show_streams', '-of', 'json', file], true));
const hashAudio = (file) => run('ffmpeg', ['-v', 'error', '-i', file, '-map', '0:a:0', '-c:a', 'copy', '-f', 'hash', '-hash', 'sha256', '-'], true);

const serveUrl = await bundle({entryPoint: path.join(repo, 'src/remotion/index.ts'), outDir: path.join(job, 'bundle'), enableCaching: false, onProgress: (p) => { if (p === 100) console.log('Bundle ready'); }});
const browser = await openBrowser('chrome', {browserExecutable, logLevel: 'warn'});
try {
  const composition = await selectComposition({id: 'GptRealVoice', serveUrl, puppeteerInstance: browser, logLevel: 'warn'});
  const {fps, durationInFrames} = composition;
  if (mode === 'stills') {
    for (const [name, sec] of [['opening', 19], ['B', 86], ['B-space', 125], ['C-board', 351], ['C-square', 432], ['C-plane', 462], ['A', 517], ['D', 567.6], ['end', 575]]) {
      const output = path.join(job, `${name}.png`);
      await renderStill({composition, serveUrl, puppeteerInstance: browser, frame: Math.round(sec * fps), output, imageFormat: 'png', logLevel: 'warn'});
      console.log(output);
    }
  } else {
    const master = probe(source).streams.find((s) => s.codec_type === 'audio');
    if (master?.codec_name !== 'aac' || Number(master.start_time) !== 0 || Math.ceil(Number(master.duration) * fps) !== durationInFrames) {
      throw new Error('Master audio timing/codec does not match the composition. Update the composition before rendering.');
    }
    const audio = path.join(job, 'voice.m4a');
    run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-n', '-i', source, '-map', '0:a:0', '-vn', '-c:a', 'copy', audio]);
    const previews = path.join(outputDir, 'gpt-preview');
    mkdirSync(mode === 'full' ? outputDir : previews, {recursive: true});
    const ranges = mode === 'full' ? [['full', 0, durationInFrames - 1]] : [
      ['B-projection', 64 * fps, 76 * fps - 1],
      ['C-board', 311 * fps, 325 * fps - 1],
      ['A-counterexample', 510 * fps, 522 * fps - 1],
    ];
    for (const [name, from, to] of ranges) {
      const tempVideo = path.join(job, `${name}-silent.mp4`);
      const output = mode === 'full' ? fullOutput : path.join(previews, `${name}.mp4`);
      if (existsSync(output)) throw new Error(`Existing output will not be overwritten: ${output}`);
      const total = to - from + 1;
      const started = Date.now();
      let lastLog = 0;
      await renderMedia({
        composition, serveUrl, puppeteerInstance: browser,
        codec: 'h264', pixelFormat: 'yuv420p', colorSpace: 'bt709', imageFormat: 'jpeg', jpegQuality: 96,
        x264Preset: 'veryfast', crf: 17, muted: true, frameRange: [from, to], outputLocation: tempVideo,
        concurrency: Number(process.env.GPT_VOICE_CONCURRENCY || 7), logLevel: 'warn',
        onProgress: ({renderedFrames, encodedFrames}) => {
          const now = Date.now();
          if (now - lastLog >= 12000 || (encodedFrames === total && lastLog < now - 500)) {
            lastLog = now;
            console.log(`${name}: ${renderedFrames}/${total} rendered, ${encodedFrames} encoded (${((now - started) / 1000).toFixed(0)}s)`);
          }
        },
      });
      const muxed = path.join(job, `${name}-muxed.mp4`);
      const audioInput = mode === 'full' ? ['-i', audio] : ['-ss', String(from / fps), '-t', String(total / fps), '-i', audio];
      run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-n', '-i', tempVideo, ...audioInput, '-map', '0:v:0', '-map', '1:a:0', '-c', 'copy', '-movflags', '+faststart', muxed]);
      const inspected = probe(muxed);
      const videoTrack = inspected.streams.find((s) => s.codec_type === 'video');
      const audioTrack = inspected.streams.find((s) => s.codec_type === 'audio');
      if (videoTrack?.width !== 1920 || videoTrack?.height !== 1080 || videoTrack?.avg_frame_rate !== '60/1' || Number(videoTrack?.nb_frames) !== total || audioTrack?.codec_name !== 'aac') {
        throw new Error('Unexpected encoded output properties.');
      }
      if (mode === 'full' && (hashAudio(source) !== hashAudio(muxed) || Math.abs(Number(audioTrack.duration) - Number(master.duration)) > 1 / 44100)) {
        throw new Error('Muxed audio differs from the master.');
      }
      run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-n', '-i', muxed, '-map', '0', '-c', 'copy', '-movflags', '+faststart', output]);
      if (mode === 'full') {
        const manifest = probe(output);
        const masterSha256 = hashAudio(source);
        const outputSha256 = hashAudio(output);
        if (masterSha256 !== outputSha256) throw new Error('Published file audio hash no longer matches the master.');
        writeFileSync(path.join(job, 'verification.json'), JSON.stringify({masterSha256, outputSha256, output: manifest}, null, 2));
      }
      console.log(`Verified: ${output}`);
    }
  }
} finally {
  await browser.close({silent: true});
}
