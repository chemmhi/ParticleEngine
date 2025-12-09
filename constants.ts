
import { LayerType, BlendMode, ColorMode, ParticleLayerData, AlbumLayerData, ImageParticleLayerData, TextParticleLayerData, SceneSettings } from './types';

export const DEFAULT_SCENE_SETTINGS: SceneSettings = {
  backgroundColor: '#050510',
  fogColor: '#050510',
  fogDensity: 20,
  ambientLightIntensity: 0.5,
  environmentPreset: 'city'
};

export const DEFAULT_PARTICLE_LAYER: Omit<ParticleLayerData, 'id'> = {
  name: '星云',
  type: LayerType.PARTICLE,
  visible: true,
  opacity: 1,
  position: [0, 0, 0],
  rotation: [0, 0, 0],
  scale: 1,
  count: 5000,
  color: '#00ffff',
  colorMode: ColorMode.SINGLE,
  size: 0.1,
  sizeVariation: 0.5, // Default size randomness
  speed: 0.5,
  noiseStrength: 0.2,
  shape: 'sphere',
  particleShape: 'circle',
  blendMode: BlendMode.NORMAL, // Changed from ADDITIVE to NORMAL for solid look
  audioReactive: true,
};

export const DEFAULT_IMAGE_PARTICLE_LAYER: Omit<ImageParticleLayerData, 'id'> = {
  name: '图片粒子',
  type: LayerType.IMAGE_PARTICLE,
  visible: true,
  opacity: 1,
  position: [0, 0, 0],
  rotation: [0, 0, 0],
  scale: 1,
  imageUrl: 'https://placehold.co/200x200/png?text=Img',
  pixelDensity: 6, 
  size: 0.05,
  color: '#ffffff',
  audioReactive: true,
  thickness: 0.5, // Reduced default thickness for less distortion
  threshold: 0.1, // Default threshold for background removal
  particleShape: 'circle'
};

export const DEFAULT_TEXT_PARTICLE_LAYER: Omit<TextParticleLayerData, 'id'> = {
  name: '文字图层',
  type: LayerType.TEXT_PARTICLE,
  visible: true,
  opacity: 1,
  position: [0, 0, 0],
  rotation: [0, 0, 0],
  scale: 1,
  text: 'NEBULA',
  fontSize: 100,
  pixelDensity: 4,
  size: 0.08,
  color: '#ff00ff',
  audioReactive: true,
  thickness: 5,
  particleShape: 'circle'
};

export const DEFAULT_ALBUM_LAYER: Omit<AlbumLayerData, 'id'> = {
  name: '3D 相册',
  type: LayerType.ALBUM,
  visible: true,
  opacity: 1,
  position: [0, 0, 0],
  rotation: [0, 0, 0],
  scale: 1,
  images: [
    'https://placehold.co/400x400/png?text=1',
    'https://placehold.co/400x400/png?text=2',
    'https://placehold.co/400x400/png?text=3',
    'https://placehold.co/400x400/png?text=4',
    'https://placehold.co/400x400/png?text=5',
    'https://placehold.co/400x400/png?text=6',
    'https://placehold.co/400x400/png?text=7',
    'https://placehold.co/400x400/png?text=8',
  ],
  layout: 'spiral',
  spacing: 1.5,
  frameConfig: {
    style: 'minimal',
    color: '#ffffff',
    borderWidth: 0.2,
    padding: 0.1,
    radius: 0.1,
    shadow: true
  }
};
