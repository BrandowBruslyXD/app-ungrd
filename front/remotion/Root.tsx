import { Composition } from 'remotion';
import { ConectaRiesgoTutorial } from './Tutorial';
import { VIDEO } from './video';

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
