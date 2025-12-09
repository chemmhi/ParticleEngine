
import React, { useRef, useState, useMemo } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { AlbumLayerData } from '../types';

interface Props {
  data: AlbumLayerData;
  onImageClick?: (url: string, position: THREE.Vector3, rotation: THREE.Quaternion, width: number, height: number) => void;
  isPaused?: boolean;
}

const PhotoMesh: React.FC<{ url: string; width: number; height: number; opacity: number; hovered: boolean }> = ({ url, width, height, opacity, hovered }) => {
    const texture = useLoader(THREE.TextureLoader, url);
    texture.anisotropy = 16;
    texture.colorSpace = THREE.SRGBColorSpace;

    return (
        <mesh>
            <planeGeometry args={[width, height]} />
            <meshStandardMaterial 
                map={texture} 
                transparent 
                opacity={opacity} 
                side={THREE.DoubleSide} 
                roughness={0.4}
                metalness={0.1}
                emissive={hovered ? '#444444' : '#000000'} // Highlight effect
            />
        </mesh>
    );
};

const FrameMesh: React.FC<{ data: AlbumLayerData; width: number; height: number }> = ({ data, width, height }) => {
  const { style, color, borderWidth, padding, radius, shadow } = data.frameConfig;

  const frameW = width + (padding * 2) + (borderWidth * 2);
  const frameH = height + (padding * 2) + (borderWidth * 2);
  const frameD = 0.1;

  if (style === 'none') return null;

  let material = <meshStandardMaterial color={color} roughness={0.5} />;
  if (style === 'wood') material = <meshStandardMaterial color="#8b5a2b" roughness={0.9} />;
  else if (style === 'metal') material = <meshStandardMaterial color={color === '#ffffff' ? '#C0C0C0' : color} metalness={0.9} roughness={0.2} />;
  else if (style === 'minimal') material = <meshStandardMaterial color={color} roughness={0.2} />;

  return (
    <group position={[0, 0, -0.06]}> 
      <RoundedBox args={[frameW, frameH, frameD]} radius={radius} smoothness={4}>
        {material}
      </RoundedBox>
      {shadow && (
        <mesh position={[0.1, -0.1, -0.1]}>
           <planeGeometry args={[frameW, frameH]} />
           <meshBasicMaterial color="#000000" transparent opacity={0.3} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
};

const AlbumLayer: React.FC<Props> = ({ data, onImageClick, isPaused }) => {
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState<number | null>(null);

  const imgW = 3;
  const imgH = 2;

  const items = useMemo(() => {
    return data.images.map((imgUrl, i) => {
        let x = 0, y = 0, z = 0;
        let rotX = 0, rotY = 0, rotZ = 0;

        if (data.layout === 'spiral') {
          const angle = i * 0.8;
          const radius = data.spacing * 2 + (i * 0.2);
          x = Math.cos(angle) * radius;
          z = Math.sin(angle) * radius;
          y = i * 0.5 - (data.images.length * 0.25);
          rotY = -angle + Math.PI / 2;
        } else if (data.layout === 'grid') {
          const col = i % 4;
          const row = Math.floor(i / 4);
          x = (col - 1.5) * (data.spacing * 2);
          y = (row - 1) * (data.spacing * 2);
          z = 0;
        } else if (data.layout === 'sphere') {
          const phi = Math.acos(-1 + (2 * i) / data.images.length);
          const theta = Math.sqrt(data.images.length * Math.PI) * phi;
          const r = data.spacing * 5;
          x = r * Math.cos(theta) * Math.sin(phi);
          y = r * Math.sin(theta) * Math.sin(phi);
          z = r * Math.cos(phi);
          rotY = Math.atan2(x, z);
          rotX = -Math.atan2(y, Math.sqrt(x * x + z * z));
        } else if (data.layout === 'random') {
           const pseudoRandom = (seed: number) => {
                const x = Math.sin(seed) * 10000;
                return x - Math.floor(x);
           };
           const spread = data.spacing * 40; 
           x = (pseudoRandom(i * 13) - 0.5) * spread;
           y = (pseudoRandom(i * 29) - 0.5) * spread;
           z = (pseudoRandom(i * 47) - 0.5) * spread;
           rotY = Math.atan2(x, z);
           rotX = -Math.atan2(y, Math.sqrt(x * x + z * z));
        }

        return { imgUrl, position: [x, y, z] as [number, number, number], rotation: [rotX, rotY, rotZ] as [number, number, number] };
    });
  }, [data.images, data.layout, data.spacing]);

  useFrame((state) => {
    if (isPaused || !groupRef.current) return;
    if (data.layout !== 'grid') {
        groupRef.current.rotation.y += 0.002;
    }
  });

  if (!data.visible) return null;

  return (
    <group 
      ref={groupRef}
      position={data.position} 
      rotation={data.rotation} 
      scale={[data.scale, data.scale, data.scale]}
    >
      {items.map((item, i) => {
        const isHovered = hovered === i;
        const scale = isHovered ? 1.1 : 1;

        return (
          <group 
            key={i} 
            position={item.position} 
            rotation={item.rotation}
            scale={[scale, scale, scale]}
            onPointerOver={() => setHovered(i)}
            onPointerOut={() => setHovered(null)}
            onClick={(e) => {
              e.stopPropagation();
              const target = new THREE.Vector3();
              const quat = new THREE.Quaternion();
              e.eventObject.getWorldPosition(target);
              e.eventObject.getWorldQuaternion(quat);
              onImageClick?.(item.imgUrl, target, quat, imgW, imgH);
            }}
            // IMPORTANT: Add userData for the App's gesture raycaster to find this
            userData={{
                isInteractable: true,
                type: 'album-image',
                index: i,
                url: item.imgUrl,
                width: imgW,
                height: imgH
            }}
          >
            <React.Suspense fallback={<mesh><planeGeometry args={[imgW, imgH]} /><meshBasicMaterial color="gray" /></mesh>}>
                <PhotoMesh url={item.imgUrl} width={imgW} height={imgH} opacity={data.opacity} hovered={isHovered} />
            </React.Suspense>
            {data.frameConfig && (
               <FrameMesh data={data} width={imgW} height={imgH} />
            )}
          </group>
        );
      })}
    </group>
  );
};

export default AlbumLayer;
