import { ScenePreset, LayerType, ColorMode, BlendMode } from './types';

export const SCENE_PRESETS: ScenePreset[] = [
  {
    id: 'snow_mountains',
    name: '添加高山',
    settings: {} as any, // Ignored now
    layers: [
      {
        name: '落雪',
        type: LayerType.PARTICLE,
        visible: true,
        opacity: 0.8,
        position: [0, 10, 0],
        rotation: [0, 0, 0],
        scale: 1,
        count: 10000,
        color: '#ffffff',
        colorMode: ColorMode.SINGLE,
        size: 0.1,
        speed: 0.2,
        noiseStrength: 0.5,
        shape: 'cube', // Wide spread
        particleShape: 'circle',
        blendMode: BlendMode.ADDITIVE,
        audioReactive: true,
      } as any,
      {
        name: '巍峨山脉',
        type: LayerType.PARTICLE,
        visible: true,
        opacity: 1,
        position: [0, -15, 0],
        rotation: [0, 0, 0],
        scale: 2,
        count: 30000,
        color: '#64748b',
        colorMode: ColorMode.RANDOM,
        size: 0.15,
        speed: 0.1,
        noiseStrength: 2, 
        shape: 'grid',
        particleShape: 'square',
        blendMode: BlendMode.NORMAL,
        audioReactive: true, // Enabled audio reactivity
      } as any
    ]
  }
];