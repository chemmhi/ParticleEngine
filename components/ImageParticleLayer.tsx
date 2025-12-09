
import React, { useRef, useMemo, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ImageParticleLayerData, ParticleShapeType } from '../types';

interface Props {
  data: ImageParticleLayerData;
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

const ImageParticleLayer: React.FC<Props> = ({ data, audioData, isPaused }) => {
  const pointsRef = useRef<THREE.Points>(null);
  const [positions, setPositions] = useState<Float32Array | null>(null);
  const [colors, setColors] = useState<Float32Array | null>(null);
  const [initialZ, setInitialZ] = useState<Float32Array | null>(null);

  // Generate texture for shape
  const shapeTexture = useMemo(() => getTexture(data.particleShape || 'circle'), [data.particleShape]);

  // Load image and generate particles
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = data.imageUrl;
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const step = Math.max(1, Math.floor(12 - data.pixelDensity)); 
      
      const maxSize = 512; 
      let width = img.width;
      let height = img.height;
      
      if (width > maxSize || height > maxSize) {
          const ratio = Math.min(maxSize / width, maxSize / height);
          width *= ratio;
          height *= ratio;
      }

      canvas.width = width;
      canvas.height = height;
      
      ctx.drawImage(img, 0, 0, width, height);
      const imageData = ctx.getImageData(0, 0, width, height);
      const pixels = imageData.data;

      const posArray = [];
      const colArray = [];
      const zArray = [];

      const threshold = data.threshold ?? 0.1;
      
      // Parse the Tint Color from layer settings
      const tintColor = new THREE.Color(data.color || '#ffffff');

      // Smart Background Detection: Sample the top-left pixel
      const bgR = pixels[0] / 255;
      const bgG = pixels[1] / 255;
      const bgB = pixels[2] / 255;

      for (let y = 0; y < height; y += step) {
        for (let x = 0; x < width; x += step) {
          const i = (Math.floor(y) * width + Math.floor(x)) * 4;
          
          if (i >= pixels.length) continue;

          const r = pixels[i] / 255;
          const g = pixels[i + 1] / 255;
          const b = pixels[i + 2] / 255;
          const a = pixels[i + 3] / 255;

          const dist = Math.sqrt(
            Math.pow(r - bgR, 2) +
            Math.pow(g - bgG, 2) +
            Math.pow(b - bgB, 2)
          );

          const brightness = (r * 0.299 + g * 0.587 + b * 0.114);

          if (a > 0.1 && dist > threshold) { 
            const finalX = (x - width / 2) * 0.1;
            const finalY = -(y - height / 2) * 0.1; // Flip Y
            const finalZ = (brightness - 0.5) * (data.thickness || 0.5); 

            posArray.push(finalX, finalY, finalZ);
            zArray.push(finalZ);
            
            // Apply Tint: Multiply pixel color by layer color
            colArray.push(r * tintColor.r, g * tintColor.g, b * tintColor.b);
          }
        }
      }

      setPositions(new Float32Array(posArray));
      setColors(new Float32Array(colArray));
      setInitialZ(new Float32Array(zArray));
    };
  }, [data.imageUrl, data.pixelDensity, data.thickness, data.threshold, data.color]);

  const geometry = useMemo(() => {
    if (!positions || !colors || !initialZ) return null;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('initialPosition', new THREE.BufferAttribute(positions.slice(), 3));
    geo.setAttribute('baseZ', new THREE.BufferAttribute(initialZ, 1));
    return geo;
  }, [positions, colors, initialZ]);

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
        
        const ix = initialPos[i3];
        const iy = initialPos[i3+1];
        const iz = initialPos[i3+2]; 
        
        // --- Enhanced Audio Reactivity ---
        // Bass affects scale/pulse (XY expansion)
        const pulse = 1 + (bass * 0.15); 
        
        // Treble adds high frequency jitter
        const jitter = (Math.random() - 0.5) * treble * 0.05; 

        // Mid creates a wave effect
        const wave = Math.sin(ix * 5 + time) * mid * 0.1;
        
        // Bass heavily affects depth (Z-extrusion)
        const depthMultiplier = 1 + (bass * 0.5); 
        const noise = (Math.sin(ix * 10 + time) * Math.cos(iy * 10)) * treble * 0.02;

        let px = ix * pulse + jitter;
        let py = iy * pulse + jitter;
        let pz = (iz * depthMultiplier) + wave + noise;

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
    pointsRef.current.rotation.y = Math.sin(time * 0.1) * 0.05;
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
        color="#ffffff" // Explicit white to prevent tinting vertexColors
        vertexColors
        transparent
        opacity={data.opacity}
        sizeAttenuation={true}
        depthWrite={true}
        blending={THREE.NormalBlending} // Solid look
        alphaTest={0.5} // Cutout transparency for shapes
      />
    </points>
  );
};

export default ImageParticleLayer;
