import React from 'react';
import {Composition} from 'remotion';
import {IdeaToProduct} from './IdeaToProduct';

export const RemotionRoot: React.FC = () => (
  <Composition
    id="IdeaToProduct"
    component={IdeaToProduct}
    durationInFrames={540}
    fps={30}
    width={1440}
    height={810}
  />
);
