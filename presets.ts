
import { ScenePreset, LayerType, ColorMode, BlendMode } from './types';

export const SCENE_PRESETS: ScenePreset[] = [
  {
    id: 'snow_mountains',
    name: '添加高山',
    settings: {} as any, 
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
        shape: 'cube', 
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
        audioReactive: true, 
      } as any
    ]
  },
  {
    id: 'christmas_tree',
    name: '圣诞树',
    settings: {} as any,
    layers: [
      // 1. 树主干 (Trunk) - Brown, tall, narrow
      {
        name: '树干',
        type: LayerType.PARTICLE,
        visible: true,
        opacity: 1,
        position: [0, -5, 0],
        rotation: [0, 0, 0],
        scale: 1, // Will be adjusted by shape logic or we use a cube with manual scale in editor
        count: 2000,
        color: '#5D4037', // Dark Brown
        colorMode: ColorMode.SINGLE,
        size: 0.15,
        speed: 0,
        noiseStrength: 0.1,
        shape: 'cube', // We'll rely on user scaling Y in editor, or default cube
        particleShape: 'square',
        blendMode: BlendMode.NORMAL,
        audioReactive: false,
      } as any,
      // 2. 树叶 (Leaves) - Green, Cone shape
      {
        name: '树叶',
        type: LayerType.PARTICLE,
        visible: true,
        opacity: 1,
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: 1.5,
        count: 15000,
        color: '#2E7D32', // Forest Green
        colorMode: ColorMode.SINGLE,
        size: 0.12,
        speed: 0.2,
        noiseStrength: 0.3,
        shape: 'cone', // Uses the Spiral Tree logic
        particleShape: 'circle',
        blendMode: BlendMode.NORMAL,
        audioReactive: true,
      } as any,
      // 3. 装饰灯 (Lights) - Random Colors, Blinking
      {
        name: '彩灯',
        type: LayerType.PARTICLE,
        visible: true,
        opacity: 1,
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: 1.55, // Slightly larger than leaves
        count: 1500,
        color: '#ffffff',
        colorMode: ColorMode.RANDOM, // Multi-colored lights
        size: 0.2,
        speed: 0.5,
        noiseStrength: 0.5,
        shape: 'cone',
        particleShape: 'circle',
        blendMode: BlendMode.ADDITIVE, // Glow effect
        audioReactive: true, // Blink with music
      } as any,
      // 4. 礼盒 (Gifts) - Cubes at the bottom
      {
        name: '礼物盒',
        type: LayerType.PARTICLE,
        visible: true,
        opacity: 1,
        position: [0, -10, 0],
        rotation: [0, 0, 0],
        scale: 1,
        count: 3000,
        color: '#FFD700',
        colorMode: ColorMode.RANDOM,
        size: 0.15,
        speed: 0.1,
        noiseStrength: 0.2,
        shape: 'cube', // Scattered around base
        particleShape: 'square',
        blendMode: BlendMode.NORMAL,
        audioReactive: true,
      } as any
    ]
  }
];
