import React from 'react';
import { Composition } from 'remotion';
import { MainComposition } from './MainComposition';
import { TOTAL_DURATION_MS } from './mathTimeline';
import {GptRealVoice} from './GptRealVoice';
import {FRAMES, FPS} from './gptTimeline';

export const RemotionRoot: React.FC = () => {
  const fps = 60;
  const durationInFrames = Math.ceil((TOTAL_DURATION_MS / 1000) * fps); // 约 12321 帧

  return (
    <>
      <Composition id="GptRealVoice" component={GptRealVoice} durationInFrames={FRAMES} fps={FPS} width={1920} height={1080} />
      <Composition
        id="DihedralTracks"
        component={MainComposition}
        durationInFrames={durationInFrames}
        fps={fps}
        width={1920}
        height={1080}
      />
    </>
  );
};
