
import React, { useRef, useMemo, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { TextParticleLayerData, ParticleShapeType } from '../types';

interface Props {
  data: TextParticleLayerData;
  audioData: { bass: number; mid: number; treble: number };
  isPaused?: boolean;
}

const getTexture = (type: ParticleShapeType) => {
  if (type === 'square') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const center = 32;
  const radius = 28;

  if (type === 'circle') {
    ctx.beginPath();
    ctx.arc(center, center, radius, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
  } else if (type === 'star') {
    ctx.beginPath();
    ctx.fillStyle = '#ffffff';
    const points = 5;
    const outerRadius = 28;
    const innerRadius = 12;
    for (let i = 0; i < points * 2; i++) {
        const angle = (i * Math.PI) / points - Math.PI / 2;
        const r = i % 2 === 0 ? outerRadius : innerRadius;
        ctx.lineTo(center + Math.cos(angle) * r, center + Math.sin(angle) * r);
    }
    ctx.closePath();
    ctx.fill();
  }
  
  const tex = new THREE.CanvasTexture(canvas);
  return tex;
};

const TextParticleLayer: React.FC<Props> = ({ data, audioData, isPaused }) => {
  const pointsRef = useRef<THREE.Points>(null);
  const [positions, setPositions] = useState<Float32Array | null>(null);
  const [colors, setColors] = useState<Float32Array | null>(null);

  const shapeTexture = useMemo(() => getTexture(data.particleShape || 'circle'), [data.particleShape]);

  // Generate particles from text
  useEffect(() => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const fontSize = data.fontSize;
    const font = `bold ${fontSize}px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif`;
    ctx.font = font;
    
    const textMetrics = ctx.measureText(data.text);
    const textWidth = Math.ceil(textMetrics.width);
    const textHeight = Math.ceil(fontSize * 1.5); 

    const width = textWidth + 40; 
    const height = textHeight + 40;
    
    canvas.width = width;
    canvas.height = height;

    ctx.clearRect(0, 0, width, height);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = font;
    
    ctx.fillStyle = data.color;
    ctx.fillText(data.text, width / 2, height / 2);

    const imageData = ctx.getImageData(0, 0, width, height);
    const pixels = imageData.data;

    const posArray = [];
    const colArray = [];
    
    const step = Math.max(1, Math.floor(12 / Math.max(1, data.pixelDensity)));

    for (let y = 0; y < height; y += step) {
      for (let x = 0; x < width; x += step) {
        const i = (y * width + x) * 4;
        const r = pixels[i] / 255;
        const g = pixels[i + 1] / 255;
        const b = pixels[i + 2] / 255;
        const a = pixels[i + 3] / 255;

        if (a > 0.1) {
          const zOffset = (Math.random() - 0.5) * data.thickness;
          
          posArray.push((x - width / 2) * 0.05);
          posArray.push(-(y - height / 2) * 0.05);
          posArray.push(zOffset);

          colArray.push(r, g, b);
        }
      }
    }

    setPositions(new Float32Array(posArray));
    setColors(new Float32Array(colArray));
  }, [data.text, data.fontSize, data.pixelDensity, data.color, data.thickness]);

  const geometry = useMemo(() => {
    if (!positions || !colors) return null;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('initialPosition', new THREE.BufferAttribute(positions.slice(), 3));
    return geo;
  }, [positions, colors]);

  useFrame((state) => {
    if (isPaused || !pointsRef.current || !geometry || !data.visible) return;

    const currentPos = pointsRef.current.geometry.attributes.position.array as Float32Array;
    const initialPos = pointsRef.current.geometry.attributes.initialPosition.array as Float32Array;
    const count = currentPos.length / 3;
    const time = state.clock.getElapsedTime();

    const bass = data.audioReactive ? audioData.bass : 0;
    const mid = data.audioReactive ? audioData.mid : 0;
    const treble = data.audioReactive ? audioData.treble : 0;

    state.raycaster.setFromCamera(state.pointer, state.camera);
    const ray = state.raycaster.ray;
    const inverseMatrix = new THREE.Matrix4().copy(pointsRef.current.matrixWorld).invert();
    const localRay = ray.clone().applyMatrix4(inverseMatrix);
    const repulsionRadius = 5;
    const repulsionStrength = 2;
    const tempVec = new THREE.Vector3();
    const closestPoint = new THREE.Vector3();

    for (let i = 0; i < count; i++) {
        const i3 = i * 3;
        
        const jitter = (Math.random() - 0.5) * mid * 0.2;
        const zExp = treble * (Math.sin(time * 10 + initialPos[i3]) * 0.5);
        const floatX = Math.sin(time * 0.5 + initialPos[i3+1]) * 0.1;
        const floatY = Math.cos(time * 0.3 + initialPos[i3]) * 0.1;
        const pulse = 1 + (bass * 0.15);

        let px = (initialPos[i3] + floatX) * pulse + jitter;
        let py = (initialPos[i3+1] + floatY) * pulse + jitter;
        let pz = initialPos[i3+2] + zExp;

        tempVec.set(px, py, pz);
        const distSq = localRay.distanceSqToPoint(tempVec);
        if (distSq < repulsionRadius * repulsionRadius) {
            const dist = Math.sqrt(distSq);
            localRay.closestPointToPoint(tempVec, closestPoint);
            
            const dirX = px - closestPoint.x;
            const dirY = py - closestPoint.y;
            const dirZ = pz - closestPoint.z;
            
            const len = Math.sqrt(dirX*dirX + dirY*dirY + dirZ*dirZ) || 0.001;
            const force = (1 - dist / repulsionRadius) * repulsionStrength;
            
            px += (dirX / len) * force;
            py += (dirY / len) * force;
            pz += (dirZ / len) * force;
        }

        currentPos[i3] = px;
        currentPos[i3+1] = py;
        currentPos[i3+2] = pz;
    }
    
    pointsRef.current.geometry.attributes.position.needsUpdate = true;
  });

  if (!geometry) return null;

  return (
    <points
      ref={pointsRef}
      geometry={geometry}
      position={data.position}
      rotation={data.rotation}
      scale={[data.scale, data.scale, data.scale]}
      visible={data.visible}
    >
      <pointsMaterial
        map={shapeTexture}
        size={data.size}
        color="#ffffff" // Explicit white
        vertexColors 
        transparent
        opacity={data.opacity}
        sizeAttenuation={true}
        depthWrite={true}
        blending={THREE.NormalBlending} // Solid Look
        alphaTest={0.5}
      />
    </points>
  );
};

export default TextParticleLayer;
