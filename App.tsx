
import React, { useState, useEffect, useRef, Suspense } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars, Environment } from '@react-three/drei';
import * as THREE from 'three';
import { v4 as uuidv4 } from 'uuid';
import { LayerData, LayerType, AudioData, SceneSettings } from './types';
import { DEFAULT_PARTICLE_LAYER, DEFAULT_ALBUM_LAYER, DEFAULT_SCENE_SETTINGS, DEFAULT_IMAGE_PARTICLE_LAYER, DEFAULT_TEXT_PARTICLE_LAYER } from './constants';
import { audioService } from './services/audioService';
import { SCENE_PRESETS } from './presets';

import ControlPanel from './components/ControlPanel';
import ParticleCloud from './components/ParticleCloud';
import AlbumLayer from './components/AlbumLayer';
import ImageParticleLayer from './components/ImageParticleLayer';
import TextParticleLayer from './components/TextParticleLayer';
import GestureOverlay from './components/GestureOverlay';
import { X, ZoomOut } from 'lucide-react';

interface FocusTarget {
  position: THREE.Vector3;
  rotation: THREE.Quaternion;
  width: number;
  height: number;
}

const CameraRig: React.FC<{ focusTarget: FocusTarget | null }> = ({ focusTarget }) => {
    const { camera, controls } = useThree();
    
    // Store previous camera state to restore later
    const stateRef = useRef<{
        saved: boolean;
        position: THREE.Vector3;
        quaternion: THREE.Quaternion;
        target: THREE.Vector3;
    }>({
        saved: false,
        position: new THREE.Vector3(),
        quaternion: new THREE.Quaternion(),
        target: new THREE.Vector3(),
    });

    useFrame((state, delta) => {
        const step = 4 * delta; // Animation speed

        if (focusTarget) {
            // 1. Save initial state before moving
            if (!stateRef.current.saved) {
                stateRef.current.position.copy(camera.position);
                stateRef.current.quaternion.copy(camera.quaternion);
                if (controls) stateRef.current.target.copy((controls as any).target);
                stateRef.current.saved = true;
                if (controls) (controls as any).enabled = false;
            }

            // 2. Calculate ideal distance to fit height
            // Distance = (ImageHeight / 2) / tan(FOV / 2)
            // Add slight margin (1.2x)
            const pCamera = camera as THREE.PerspectiveCamera;
            const fovRad = THREE.MathUtils.degToRad(pCamera.fov);
            const distance = (focusTarget.height / 2) / Math.tan(fovRad / 2) * 1.3;

            // 3. Determine target position
            // The image faces +Z relative to its rotation. We want to be in front of it.
            // normal vector = (0,0,1) rotated by image's quaternion
            const normal = new THREE.Vector3(0, 0, 1).applyQuaternion(focusTarget.rotation);
            const targetPos = focusTarget.position.clone().add(normal.multiplyScalar(distance));

            // 4. Animate Position
            camera.position.lerp(targetPos, step);
            
            // 5. Animate Rotation (Look at image flatly)
            // We want the camera to look opposite to the normal
            const lookAtMatrix = new THREE.Matrix4().lookAt(camera.position, focusTarget.position, new THREE.Vector3(0, 1, 0));
            const targetQuat = new THREE.Quaternion().setFromRotationMatrix(lookAtMatrix);
            camera.quaternion.slerp(targetQuat, step);
            
            // Keep controls target on the object so if user could rotate, it spins around object
            if (controls) (controls as any).target.lerp(focusTarget.position, step);

        } else {
            // Restore Phase
            if (stateRef.current.saved) {
                // Lerp back to original state
                camera.position.lerp(stateRef.current.position, step);
                camera.quaternion.slerp(stateRef.current.quaternion, step);
                if (controls) (controls as any).target.lerp(stateRef.current.target, step);

                // Check if restoration is complete (close enough)
                if (camera.position.distanceTo(stateRef.current.position) < 0.1) {
                    stateRef.current.saved = false;
                    if (controls) (controls as any).enabled = true;
                }
            }
        }
    });
    return null;
}

const App: React.FC = () => {
  // --- State ---
  // Initialize with a locked base layer
  const [layers, setLayers] = useState<LayerData[]>([
    { ...DEFAULT_PARTICLE_LAYER, id: uuidv4(), name: 'Base Layer', locked: true } as LayerData,
  ]);
  const [sceneSettings, setSceneSettings] = useState<SceneSettings>(DEFAULT_SCENE_SETTINGS);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(layers[0].id);
  const [audioActive, setAudioActive] = useState(false);
  const [audioReady, setAudioReady] = useState(false);
  const [audioData, setAudioData] = useState<AudioData>({ frequency: new Uint8Array(), bass: 0, mid: 0, treble: 0 });
  const [focusTarget, setFocusTarget] = useState<FocusTarget | null>(null);
  
  const orbitRef = useRef<any>(null);
  const isPaused = focusTarget !== null;

  // --- Handlers ---
  const handleAddLayer = (type: LayerType) => {
    let newLayer;
    if (type === LayerType.PARTICLE) {
        newLayer = { ...DEFAULT_PARTICLE_LAYER, id: uuidv4(), name: `Particle Layer ${layers.length + 1}` };
    } else if (type === LayerType.ALBUM) {
        newLayer = { ...DEFAULT_ALBUM_LAYER, id: uuidv4(), name: `Album Layer ${layers.length + 1}` };
    } else if (type === LayerType.IMAGE_PARTICLE) {
        newLayer = { ...DEFAULT_IMAGE_PARTICLE_LAYER, id: uuidv4(), name: `Img Layer ${layers.length + 1}` };
    } else if (type === LayerType.TEXT_PARTICLE) {
        newLayer = { ...DEFAULT_TEXT_PARTICLE_LAYER, id: uuidv4(), name: `Text Layer ${layers.length + 1}` };
    }
    
    if (newLayer) {
        setLayers(prev => [...prev, newLayer as LayerData]);
        setSelectedLayerId(newLayer.id);
    }
  };

  const handleUpdateLayer = (id: string, updates: Partial<LayerData>) => {
    setLayers(prev => prev.map(l => l.id === id ? { ...l, ...updates } as LayerData : l));
  };

  const handleDeleteLayer = (id: string) => {
    const layer = layers.find(l => l.id === id);
    if (layer?.locked) return; // Prevent deletion of locked layers

    setLayers(prev => prev.filter(l => l.id !== id));
    if (selectedLayerId === id) setSelectedLayerId(null);
  };

  const handleUpdateScene = (updates: Partial<SceneSettings>) => {
      setSceneSettings(prev => ({...prev, ...updates}));
  };

  const handlePresetView = (view: 'front' | 'top' | 'side') => {
      if (!orbitRef.current) return;
      if (view === 'front') {
        orbitRef.current.setAzimuthalAngle(0);
        orbitRef.current.setPolarAngle(Math.PI / 2);
      } else if (view === 'top') {
        orbitRef.current.setAzimuthalAngle(0);
        orbitRef.current.setPolarAngle(0);
      } else if (view === 'side') {
        orbitRef.current.setAzimuthalAngle(Math.PI / 2);
        orbitRef.current.setPolarAngle(Math.PI / 2);
      }
  };

  const handleLoadPreset = (presetId: string) => {
      const preset = SCENE_PRESETS.find(p => p.id === presetId);
      if (preset) {
          // Do NOT reset scene settings. Decouple models from scene.
          // setSceneSettings(preset.settings); 
          
          const newLayers = preset.layers.map((l) => ({ 
              ...l, 
              id: uuidv4(),
              locked: false // Imported models should not be locked
          } as LayerData));
          
          // Append new layers to existing ones
          setLayers(prev => [...prev, ...newLayers]);
          
          if (newLayers.length > 0) setSelectedLayerId(newLayers[0].id);
      }
  };

  const handleToggleAudio = async () => {
    if (!audioActive) {
      if (!audioReady) {
         await audioService.initialize('https://storage.googleapis.com/media-session/sintel/snow-fight.mp3'); 
         setAudioReady(true);
      }
      audioService.play();
      setAudioActive(true);
    } else {
      audioService.pause();
      setAudioActive(false);
    }
  };

  const handleAudioInitialized = () => {
      setAudioReady(true);
      if (!audioActive) {
          setAudioActive(true);
          audioService.play();
      }
  };

  const handleGesture = (gesture: string) => {
    if (!selectedLayerId) return;
    const layer = layers.find(l => l.id === selectedLayerId);
    if (!layer) return;

    if (gesture === 'Swipe Left' || gesture === '左滑 (Swipe Left)') {
        handleUpdateLayer(layer.id, { position: [layer.position[0] - 5, layer.position[1], layer.position[2]] });
    } else if (gesture === 'Swipe Right' || gesture === '右滑 (Swipe Right)') {
        handleUpdateLayer(layer.id, { position: [layer.position[0] + 5, layer.position[1], layer.position[2]] });
    } else if (gesture === 'Open Palm (Reset)' || gesture === '张开手掌 (Open Palm)') {
        handleUpdateLayer(layer.id, { position: [0, 0, 0], rotation: [0, 0, 0] });
    } else if (gesture === 'Fist (Pause)' || gesture === '握拳 (Fist)') {
        handleUpdateLayer(layer.id, { visible: !layer.visible });
    }
  };

  useEffect(() => {
    let animationFrameId: number;
    const tick = () => {
      if (audioActive) {
        setAudioData(audioService.getFrequencyData());
      }
      animationFrameId = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(animationFrameId);
  }, [audioActive]);

  return (
    <div className="w-full h-screen bg-slate-900 relative">
      <ControlPanel 
        layers={layers}
        selectedLayerId={selectedLayerId}
        onSelectLayer={setSelectedLayerId}
        onAddLayer={handleAddLayer}
        onDeleteLayer={handleDeleteLayer}
        onUpdateLayer={handleUpdateLayer}
        audioActive={audioActive}
        audioReady={audioReady}
        onToggleAudio={handleToggleAudio}
        onAudioFileLoaded={handleAudioInitialized}
        sceneSettings={sceneSettings}
        onUpdateScene={handleUpdateScene}
        onPresetView={handlePresetView}
        onLoadPreset={handleLoadPreset}
      />

      <GestureOverlay onGesture={handleGesture} />

      {focusTarget && (
          <div className="absolute top-4 right-4 z-50 animate-in fade-in duration-300">
              <button 
                onClick={() => setFocusTarget(null)}
                className="bg-slate-800/80 backdrop-blur hover:bg-red-500/80 text-white px-4 py-2 rounded-full border border-slate-600 flex items-center gap-2 shadow-xl transition-all"
              >
                  <ZoomOut size={18} />
                  <span className="text-sm font-medium">退出预览</span>
              </button>
          </div>
      )}

      <div className="w-full h-full pl-80"> 
        <Canvas camera={{ position: [0, 0, 30], fov: 60 }} gl={{ antialias: true, toneMappingExposure: 1.2 }}>
            <color attach="background" args={[sceneSettings.backgroundColor]} />
            <fog attach="fog" args={[sceneSettings.fogColor, sceneSettings.fogDensity, 100]} />
            <ambientLight intensity={sceneSettings.ambientLightIntensity} />
            
            <Suspense fallback={null}>
                <Environment preset={sceneSettings.environmentPreset as any} />
                <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
                
                <CameraRig focusTarget={focusTarget} />

                <group>
                  {layers.map(layer => {
                    if (layer.type === LayerType.PARTICLE) {
                      return <ParticleCloud key={layer.id} data={layer as any} audioData={audioData} isPaused={isPaused} />;
                    } else if (layer.type === LayerType.ALBUM) {
                      return <AlbumLayer 
                                key={layer.id} 
                                data={layer as any} 
                                onImageClick={(url, pos, rot, w, h) => setFocusTarget({ position: pos, rotation: rot, width: w, height: h })} 
                                isPaused={isPaused}
                             />;
                    } else if (layer.type === LayerType.IMAGE_PARTICLE) {
                      return <ImageParticleLayer key={layer.id} data={layer as any} audioData={audioData} isPaused={isPaused} />;
                    } else if (layer.type === LayerType.TEXT_PARTICLE) {
                      return <TextParticleLayer key={layer.id} data={layer as any} audioData={audioData} isPaused={isPaused} />;
                    }
                    return null;
                  })}
                </group>

                <OrbitControls 
                  ref={orbitRef}
                  makeDefault 
                  enableDamping 
                  dampingFactor={0.05} 
                  minDistance={2} 
                  maxDistance={100}
                  enablePan={true}
                  panSpeed={1}
                />
            </Suspense>
        </Canvas>
      </div>
      
      {audioActive && (
        <div className="absolute bottom-4 right-4 bg-slate-900/50 backdrop-blur border border-slate-700 p-2 rounded flex items-end gap-1 h-16 w-32 pointer-events-none z-10">
            {Array.from(audioData.frequency).slice(0, 16).map((val, i) => (
                <div 
                    key={i} 
                    className="flex-1 bg-cyan-500/80 rounded-t-sm transition-all duration-75"
                    style={{ height: `${(val / 255) * 100}%` }}
                />
            ))}
        </div>
      )}
    </div>
  );
};

export default App;
