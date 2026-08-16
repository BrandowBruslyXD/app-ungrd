import { Composition } from 'remotion';
import { ConectaRiesgoTutorial } from './Tutorial';

const VIDEO = {
  fps: 30,
  width: 1920,
  height: 1080,
  durationInFrames: 1350,
} as const;

export const RemotionRoot = () => (
  <Composition
    id="ConectaRiesgoTutorial"
    component={ConectaRiesgoTutorial}
    durationInFrames={VIDEO.durationInFrames}
    fps={VIDEO.fps}
    width={VIDEO.width}
    height={VIDEO.height}
  />
);
