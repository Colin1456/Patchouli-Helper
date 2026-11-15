import React from 'react';
import { Composition } from 'remotion';
import { Backdrop, Promo } from './Promo';
import { Cover } from './Cover';
import { FPS, H, W } from './theme';

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="Promo"
      component={Promo}
      durationInFrames={2160}
      fps={FPS}
      width={W}
      height={H}
    />
    {/* 只有背景的参照帧：静帧体检用来做差分，判断前景内容的真实包围盒 */}
    <Composition id="Bed" component={Backdrop} durationInFrames={1} fps={FPS} width={W} height={H} />
    {/* B站封面：静态 1920×1080 */}
    <Composition id="Cover" component={Cover} durationInFrames={1} fps={FPS} width={W} height={H} />
  </>
);
