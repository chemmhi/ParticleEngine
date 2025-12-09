
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
import { ZoomOut } from 'lucide-react';

interface FocusTarget {
  position: THREE.Vector3;
  rotation: THREE.Quaternion;
  width: number;
  height: number;
}

const CameraRig: React.FC<{ focusTarget: FocusTarget | null }> = ({ focusTarget }) => {
    const { camera, controls } = useThree();
    
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
        const step = 4 * delta; 

        if (focusTarget) {
            if (!stateRef.current.saved) {
                stateRef.current.position.copy(camera.position);
                stateRef.current.quaternion.copy(camera.quaternion);
                if (controls) stateRef.current.target.copy((controls as any).target);
                stateRef.current.saved = true;
                if (controls) (controls as any).enabled = false;
            }

            const pCamera = camera as THREE.PerspectiveCamera;
            const fovRad = THREE.MathUtils.degToRad(pCamera.fov);
            const distance = (focusTarget.height / 2) / Math.tan(fovRad / 2) * 1.3;

            const normal = new THREE.Vector3(0, 0, 1).applyQuaternion(focusTarget.rotation);
            const targetPos = focusTarget.position.clone().add(normal.multiplyScalar(distance));

            camera.position.lerp(targetPos, step);
            
            const lookAtMatrix = new THREE.Matrix4().lookAt(camera.position, focusTarget.position, new THREE.Vector3(0, 1, 0));
            const targetQuat = new THREE.Quaternion().setFromRotationMatrix(lookAtMatrix);
            camera.quaternion.slerp(targetQuat, step);
            
            if (controls) (controls as any).target.lerp(focusTarget.position, step);

        } else {
            if (stateRef.current.saved) {
                camera.position.lerp(stateRef.current.position, step);
                camera.quaternion.slerp(stateRef.current.quaternion, step);
                if (controls) (controls as any).target.lerp(stateRef.current.target, step);

                if (camera.position.distanceTo(stateRef.current.position) < 0.1) {
                    stateRef.current.saved = false;
                    if (controls) (controls as any).enabled = true;
                }
            }
        }
    });
    return null;
}

// Center Raycaster for "Grab" Gesture - Modified to find image most facing the camera
const CenterRaycaster: React.FC<{ trigger: number, onHit: (obj: any) => void }> = ({ trigger, onHit }) => {
    const { camera, scene } = useThree();
    const lastTriggerRef = useRef(0);

    useFrame(() => {
        if (trigger === lastTriggerRef.current) return;
        lastTriggerRef.current = trigger;

        const candidates: { alignment: number, dist: number, obj: THREE.Object3D }[] = [];
        const camDir = new THREE.Vector3();
        camera.getWorldDirection(camDir); // Vector pointing where camera looks

        scene.traverse((obj) => {
            if (obj.userData?.isInteractable) {
                const pos = new THREE.Vector3();
                obj.getWorldPosition(pos);
                
                // Project to NDC to check visibility
                const ndcPos = pos.clone().project(camera);
                
                // Check if roughly on screen (-1 to 1) and in front
                // Relaxed X/Y threshold to 0.8 to capture items slightly off center
                if (Math.abs(ndcPos.z) < 1 && Math.abs(ndcPos.x) < 0.8 && Math.abs(ndcPos.y) < 0.8) {
                    
                    const objNormal = new THREE.Vector3(0, 0, 1);
                    objNormal.applyQuaternion(obj.getWorldQuaternion(new THREE.Quaternion()));

                    // Dot product of View Dir and Object Normal
                    // -1 means they are perfectly facing each other (Camera looking at Front of image)
                    // 1 means looking at back
                    const alignment = camDir.dot(objNormal);
                    
                    // Filter out objects facing away or perpendicular (alignment > 0 means seeing back or side)
                    // Accepting slight angles (0.2 threshold)
                    if (alignment < 0.2) { 
                        candidates.push({ 
                            alignment, 
                            dist: pos.distanceTo(camera.position),
                            obj 
                        });
                    }
                }
            }
        });

        // Sort by Alignment (Lowest is best, i.e., closest to -1)
        // Secondary sort by distance if alignment is very similar
        candidates.sort((a, b) => {
            if (Math.abs(a.alignment - b.alignment) < 0.1) {
                return a.dist - b.dist;
            }
            return a.alignment - b.alignment;
        });

        if (candidates.length > 0) {
             const best = candidates[0];
             onHit({
                 ...best.obj.userData,
                 object: best.obj
             });
        }
    });
    return null;
}

const App: React.FC = () => {
  // --- State ---
  const [layers, setLayers] = useState<LayerData[]>([
    { ...DEFAULT_PARTICLE_LAYER, id: uuidv4(), name: 'Base Layer', locked: true } as LayerData,
  ]);
  const [sceneSettings, setSceneSettings] = useState<SceneSettings>(DEFAULT_SCENE_SETTINGS);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(layers[0].id);
  const [audioActive, setAudioActive] = useState(false);
  const [audioReady, setAudioReady] = useState(false);
  const [audioData, setAudioData] = useState<AudioData>({ frequency: new Uint8Array(), bass: 0, mid: 0, treble: 0 });
  const [focusTarget, setFocusTarget] = useState<FocusTarget | null>(null);
  
  // Gesture State
  const [grabSignal, setGrabSignal] = useState(0); 

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
    if (layer?.locked) return;

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
          const newLayers = preset.layers.map((l) => ({ 
              ...l, 
              id: uuidv4(),
              locked: false
          } as LayerData));
          
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

  const handleObjectHit = (data: any) => {
      if (data.type === 'album-image') {
          const targetObj = data.object;
          const targetPos = new THREE.Vector3();
          const targetQuat = new THREE.Quaternion();
          targetObj.getWorldPosition(targetPos);
          targetObj.getWorldQuaternion(targetQuat);
          
          setFocusTarget({
              position: targetPos,
              rotation: targetQuat,
              width: data.width,
              height: data.height
          });
      }
  };

  // --- STRICT GESTURE HANDLING ---
  const handleGesture = (gesture: string, data?: any) => {
    if (!orbitRef.current) return;

    // 1. ROTATE (Index + Middle Fingers)
    if (gesture === 'Rotate' && data && !focusTarget) {
        // Boosted sensitivity from 3.0 to 20.0 for faster response
        const SENSITIVITY = 20.0;
        const currentAzimuth = orbitRef.current.getAzimuthalAngle();
        orbitRef.current.setAzimuthalAngle(currentAzimuth - (data.dx * SENSITIVITY));
        
        const currentPolar = orbitRef.current.getPolarAngle();
        // FIXED: Inverted direction for Polar (Up/Down) to match hand movement
        const newPolar = Math.max(0.1, Math.min(Math.PI - 0.1, currentPolar - (data.dy * SENSITIVITY)));
        orbitRef.current.setPolarAngle(newPolar);
        orbitRef.current.update();
    }
    
    // 2. CONTINUOUS ZOOM IN (Spread)
    else if (gesture === 'ZoomIn') {
        const ZOOM_STEP = 1.0; 
        const controls = orbitRef.current;
        const camera = controls.object as THREE.Camera;
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
        
        // Move closer
        const nextPos = camera.position.clone().add(forward.multiplyScalar(ZOOM_STEP));
        if (nextPos.length() > 5) { // Min distance limit
            camera.position.add(forward.multiplyScalar(ZOOM_STEP));
            controls.target.add(forward.multiplyScalar(ZOOM_STEP));
            controls.update();
        }
    }

    // 3. CONTINUOUS ZOOM OUT (Pinch)
    else if (gesture === 'ZoomOut') {
        const ZOOM_STEP = 1.0; 
        const controls = orbitRef.current;
        const camera = controls.object as THREE.Camera;
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
        
        // Move away (subtract forward vector)
        const nextPos = camera.position.clone().sub(forward.multiplyScalar(ZOOM_STEP));
        if (nextPos.length() < 100) { // Max distance limit
            camera.position.sub(forward.multiplyScalar(ZOOM_STEP));
            controls.target.sub(forward.multiplyScalar(ZOOM_STEP));
            controls.update();
        }
    }

    // 4. GRAB (Fist) -> Preview
    else if (gesture === 'Grab') {
        setGrabSignal(s => s + 1); // Trigger CenterRaycaster
    }

    // 5. RELEASE (Open Palm) -> Cancel Preview
    else if (gesture === 'Release') {
        setFocusTarget(null);
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

      <GestureOverlay onGesture={handleGesture} isInPreview={focusTarget !== null} />
      
      {focusTarget && (
          <div className="absolute top-4 right-4 z-40 animate-in fade-in duration-300">
              <button 
                onClick={() => setFocusTarget(null)}
                className="bg-slate-800/80 backdrop-blur hover:bg-red-500/80 text-white px-4 py-2 rounded-full border border-slate-600 flex items-center gap-2 shadow-xl transition-all"
              >
                  <ZoomOut size={18} />
                  <span className="text-sm font-medium">张开手掌以退出预览</span>
              </button>
          </div>
      )}

      {/* Main Canvas Container - Removed padding so it fills screen */}
      <div className="w-full h-full absolute inset-0 z-0"> 
        <Canvas camera={{ position: [0, 0, 30], fov: 60 }} gl={{ antialias: true, toneMappingExposure: 1.2 }}>
            <color attach="background" args={[sceneSettings.backgroundColor]} />
            <fog attach="fog" args={[sceneSettings.fogColor, sceneSettings.fogDensity, 100]} />
            <ambientLight intensity={sceneSettings.ambientLightIntensity} />
            
            <Suspense fallback={null}>
                <Environment preset={sceneSettings.environmentPreset as any} />
                <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
                
                <CameraRig focusTarget={focusTarget} />
                <CenterRaycaster trigger={grabSignal} onHit={handleObjectHit} />

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
                  enablePan={false}
                  enableZoom={true}
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
