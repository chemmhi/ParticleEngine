
import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ParticleLayerData, BlendMode, ColorMode } from '../types';

interface Props {
  data: ParticleLayerData;
  audioData: { bass: number; mid: number; treble: number };
  isPaused?: boolean;
}

// Define Star Shape for 2D geometry
const starShape = new THREE.Shape();
const points = 5;
const outerRadius = 0.5;
const innerRadius = 0.25;
for (let i = 0; i < points * 2; i++) {
  const angle = (i * Math.PI) / points;
  const radius = i % 2 === 0 ? outerRadius : innerRadius;
  const x = Math.cos(angle) * radius;
  const y = Math.sin(angle) * radius;
  if (i === 0) starShape.moveTo(x, y);
  else starShape.lineTo(x, y);
}
starShape.closePath();

const ParticleCloud: React.FC<Props> = ({ data, audioData, isPaused }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const isTintedRef = useRef(false);

  // Static generation of positions and randoms to reuse in animation loop
  const { positions, randoms, initialColors } = useMemo(() => {
    const count = data.count;
    const pos = new Float32Array(count * 3);
    const rnd = new Float32Array(count * 3);
    const cols = new Float32Array(count * 3);
    const baseColor = new THREE.Color(data.color);

    for (let i = 0; i < count; i++) {
      let x = 0, y = 0, z = 0;

      if (data.shape === 'sphere') {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos((Math.random() * 2) - 1);
        const r = Math.cbrt(Math.random()) * 10; 
        x = r * Math.sin(phi) * Math.cos(theta);
        y = r * Math.sin(phi) * Math.sin(theta);
        z = r * Math.cos(phi);
      } else if (data.shape === 'cone') {
        // Tree Shape (Standard Cone)
        const height = 20;
        const baseRadius = 8;
        const hRatio = Math.pow(Math.random(), 0.8); 
        const h = hRatio * height; 
        const rMax = baseRadius * (1 - h / height);
        
        // Removed spiral offset (h * 5) for standard distribution
        const angle = Math.random() * Math.PI * 2;
        
        const r = Math.random() * rMax;
        const droop = r * 0.2;
        
        x = r * Math.cos(angle);
        y = h - 10 - droop; 
        z = r * Math.sin(angle);

      } else if (data.shape === 'grid') {
        // STEEP MOUNTAINS
        const size = 60;
        x = (Math.random() - 0.5) * size;
        z = (Math.random() - 0.5) * size;
        
        // Multi-frequency noise for jagged terrain
        const f1 = Math.sin(x * 0.15) * Math.cos(z * 0.15) * 8; 
        const f2 = Math.sin(x * 0.4 + 1) * Math.cos(z * 0.4 + 2) * 4;
        const f3 = Math.sin(x * 1.2) * Math.sin(z * 1.2) * 1.5;
        
        const baseHeight = f1 + f2 + f3;
        // Sharpen the peaks significantly
        const sharpness = Math.pow(Math.abs(baseHeight), 1.4) * (baseHeight > 0 ? 1 : -1);

        y = sharpness - 10; 
        
      } else {
        // Cube
        const side = 20;
        x = (Math.random() - 0.5) * side;
        y = (Math.random() - 0.5) * side;
        z = (Math.random() - 0.5) * side;
      }

      pos[i * 3] = x;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = z;

      rnd[i * 3] = Math.random();
      rnd[i * 3 + 1] = Math.random();
      rnd[i * 3 + 2] = Math.random();

      // Color Mode
      if (data.colorMode === ColorMode.RANDOM) {
        const hue = Math.random();
        const saturation = 0.5 + Math.random() * 0.5;
        const lightness = 0.5 + Math.random() * 0.5;
        const tempColor = new THREE.Color().setHSL(hue, saturation, lightness);
        cols[i * 3] = tempColor.r;
        cols[i * 3 + 1] = tempColor.g;
        cols[i * 3 + 2] = tempColor.b;
      } else {
        cols[i * 3] = baseColor.r;
        cols[i * 3 + 1] = baseColor.g;
        cols[i * 3 + 2] = baseColor.b;
      }
    }

    return { positions: pos, randoms: rnd, initialColors: cols };
  }, [data.count, data.shape, data.color, data.colorMode]);


  // Explicitly update instance colors when they change
  useEffect(() => {
      if (meshRef.current && initialColors) {
          const tempColor = new THREE.Color();
          for(let i=0; i<data.count; i++) {
              tempColor.setRGB(initialColors[i*3], initialColors[i*3+1], initialColors[i*3+2]);
              meshRef.current.setColorAt(i, tempColor);
          }
          if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
          isTintedRef.current = false;
      }
  }, [initialColors, data.count, data.audioReactive]); // Reset when audioReactive toggles


  // Update loop for animation
  useFrame((state) => {
    if (isPaused || !meshRef.current || !data.visible) return;

    const count = data.count;
    const time = state.clock.getElapsedTime();

    const bassFactor = data.audioReactive ? audioData.bass * 2 : 0;
    const trebleFactor = data.audioReactive ? audioData.treble * 5 : 0;
    const midFactor = data.audioReactive ? audioData.mid : 0;

    const moveSpeed = (data.speed * 0.5) + (trebleFactor * 0.1);
    const noiseAmp = data.noiseStrength + (bassFactor * 0.5);

    // Mouse Repulsion Setup
    state.raycaster.setFromCamera(state.pointer, state.camera);
    const ray = state.raycaster.ray;
    const inverseMatrix = new THREE.Matrix4().copy(meshRef.current.matrixWorld).invert();
    const localRay = ray.clone().applyMatrix4(inverseMatrix);
    const repulsionRadius = 5;
    const repulsionStrength = 2;
    const tempVec = new THREE.Vector3();
    const tempColor = new THREE.Color();

    // Audio Reactive Tinting Logic
    // We only update colors if we are actively tinting OR if we need to revert a previous tint
    const shouldTint = data.audioReactive && data.colorMode === ColorMode.SINGLE && midFactor > 0.05;
    
    if (shouldTint || isTintedRef.current) {
        const tintStrength = shouldTint ? midFactor * 0.5 : 0;
        const targetTint = new THREE.Color(1, 1, 1);
        
        for (let i = 0; i < count; i++) {
            const i3 = i * 3;
            tempColor.setRGB(initialColors[i3], initialColors[i3+1], initialColors[i3+2]);
            if (tintStrength > 0) {
                tempColor.lerp(targetTint, tintStrength);
            }
            meshRef.current.setColorAt(i, tempColor);
        }
        if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
        isTintedRef.current = shouldTint;
    }

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const rndX = randoms[i3];
      const rndY = randoms[i3 + 1];
      const rndZ = randoms[i3 + 2];
      const ix = positions[i3];
      const iy = positions[i3+1];
      const iz = positions[i3+2];

      let px = ix, py = iy, pz = iz;

      // Animation Logic
      if (data.shape === 'grid') {
         const peakFactor = Math.abs(iy + 10) / 10; 
         py = iy + (bassFactor * peakFactor * 2);
      } else if (data.shape === 'cone') {
         // Removed spiral/sway animation for natural stable tree look
         if (data.audioReactive && audioData.bass > 0.1) {
             const pulse = 1 + audioData.bass * 0.01;
             px = ix * pulse;
             pz = iz * pulse;
         }
      } else {
         // Cloud/Cube
         px = ix + Math.sin(time * moveSpeed + rndX * 10) * noiseAmp;
         py = iy + Math.cos(time * moveSpeed * 0.8 + rndY * 10) * noiseAmp;
         pz = iz + Math.sin(time * moveSpeed * 0.5 + rndZ * 10) * noiseAmp;
         
         if (data.audioReactive && audioData.bass > 0.1) {
             const pulse = 1 + audioData.bass * 0.01;
             px *= pulse;
             py *= pulse;
             pz *= pulse;
         }
      }

      // Mouse Repulsion
      tempVec.set(px, py, pz);
      const distSq = localRay.distanceSqToPoint(tempVec);
      if (distSq < repulsionRadius * repulsionRadius) {
          const dist = Math.sqrt(distSq);
          const closestPoint = new THREE.Vector3();
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

      // Update Instance Matrix
      dummy.position.set(px, py, pz);
      
      if (data.shape !== 'grid' && data.shape !== 'cone') {
          dummy.rotation.set(
              rndX * Math.PI * 2 + time * 0.5,
              rndY * Math.PI * 2 + time * 0.3,
              rndZ * Math.PI * 2
          );
      } else {
          dummy.rotation.set(0, 0, 0);
      }

      const variationFactor = 1 - (rndX * (data.sizeVariation || 0));
      const scaleBase = data.size * variationFactor * (1 + (data.audioReactive ? audioData.bass * 0.5 : 0));
      
      dummy.scale.set(scaleBase, scaleBase, scaleBase);
      
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }

    meshRef.current.instanceMatrix.needsUpdate = true;
    
    // Rotate scene slightly
    if (data.shape !== 'grid') {
        meshRef.current.rotation.y = time * 0.05;
    }
  });

  // Select 3D Geometry
  const GeometryComponent = useMemo(() => {
    switch (data.particleShape) {
      case 'square': return <boxGeometry args={[1, 1, 1]} />;
      case 'star': return <shapeGeometry args={[starShape]} />; // 2D Star Shape
      case 'circle': 
      default: return <sphereGeometry args={[0.5, 8, 8]} />; // Low poly sphere
    }
  }, [data.particleShape]);

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, data.count]}
      position={data.position}
      rotation={data.rotation}
      scale={[data.scale, data.scale, data.scale]}
      visible={data.visible}
    >
      {GeometryComponent}
      <meshStandardMaterial
        color="#ffffff" // IMPORTANT: Must be white for vertexColors to show true color
        // vertexColors={true} REMOVED to fix black particles bug in single color mode
        transparent={data.opacity < 1.0}
        opacity={data.opacity}
        depthWrite={true}
        roughness={0.4}
        metalness={0.1}
        side={THREE.DoubleSide}
        blending={data.blendMode === BlendMode.ADDITIVE ? THREE.AdditiveBlending : THREE.NormalBlending}
      />
    </instancedMesh>
  );
};

export default ParticleCloud;
