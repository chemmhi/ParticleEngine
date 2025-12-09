
// Augment JSX namespace to include React Three Fiber intrinsic elements
declare global {
  namespace JSX {
    interface IntrinsicElements {
      group: any;
      points: any;
      pointsMaterial: any;
      color: any;
      fog: any;
      instancedMesh: any;
      boxGeometry: any;
      sphereGeometry: any;
      shapeGeometry: any;
      meshStandardMaterial: any;
      mesh: any;
      planeGeometry: any;
      meshBasicMaterial: any;
    }
  }
}

export enum LayerType {
  PARTICLE = 'PARTICLE',
  IMAGE_PARTICLE = 'IMAGE_PARTICLE',
  TEXT_PARTICLE = 'TEXT_PARTICLE',
  ALBUM = 'ALBUM'
}

export enum BlendMode {
  NORMAL = 'normal',
  ADDITIVE = 'additive',
}

export enum ColorMode {
  SINGLE = 'SINGLE',
  RANDOM = 'RANDOM'
}

export type ParticleShapeType = 'circle' | 'square' | 'star';

export interface BaseLayer {
  id: string;
  name: string;
  type: LayerType;
  visible: boolean;
  opacity: number;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
  locked?: boolean; // New property to lock layers
}

export interface ParticleLayerData extends BaseLayer {
  type: LayerType.PARTICLE;
  count: number;
  color: string;
  colorMode: ColorMode;
  size: number;
  sizeVariation: number; // 0 to 1
  speed: number;
  noiseStrength: number;
  shape: 'sphere' | 'cube' | 'cone' | 'grid';
  particleShape: ParticleShapeType;
  blendMode: BlendMode;
  audioReactive: boolean;
}

export interface ImageParticleLayerData extends BaseLayer {
  type: LayerType.IMAGE_PARTICLE;
  imageUrl: string;
  pixelDensity: number; // 1-100%
  size: number;
  color: string; // fallback or tint
  audioReactive: boolean;
  thickness: number;
  threshold: number; // 0-1, cutoff for background removal
  particleShape: ParticleShapeType;
}

export interface TextParticleLayerData extends BaseLayer {
  type: LayerType.TEXT_PARTICLE;
  text: string;
  fontSize: number;
  pixelDensity: number;
  size: number;
  color: string;
  audioReactive: boolean;
  thickness: number;
  particleShape: ParticleShapeType;
}

export type FrameStyle = 'none' | 'minimal' | 'wood' | 'metal' | 'custom';

export interface FrameConfig {
  style: FrameStyle;
  color: string;
  borderWidth: number;
  padding: number;
  radius: number;
  shadow: boolean;
}

export interface AlbumLayerData extends BaseLayer {
  type: LayerType.ALBUM;
  images: string[];
  layout: 'spiral' | 'grid' | 'sphere' | 'random';
  spacing: number;
  frameConfig: FrameConfig;
}

export type LayerData = ParticleLayerData | AlbumLayerData | ImageParticleLayerData | TextParticleLayerData;

export interface AudioData {
  frequency: Uint8Array;
  bass: number;
  mid: number;
  treble: number;
}

export interface SceneSettings {
  backgroundColor: string;
  fogColor: string;
  fogDensity: number;
  ambientLightIntensity: number;
  environmentPreset: string;
}

export interface ScenePreset {
  id: string;
  name: string;
  settings: SceneSettings;
  layers: Omit<LayerData, 'id'>[];
}
