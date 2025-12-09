
import React, { useState, useEffect, useRef } from 'react';
import { Hand, Camera, CameraOff, RefreshCw, GripHorizontal, MoveDiagonal, Maximize2, Minimize2, MousePointerClick, ChevronDown, ChevronUp } from 'lucide-react';
import { gestureService } from '../services/gestureService';
import { audioService } from '../services/audioService';
import { DrawingUtils, NormalizedLandmark, HandLandmarker } from '@mediapipe/tasks-vision';

interface Props {
  onGesture: (type: string, data?: any) => void;
  isInPreview: boolean;
}

// Math Helper: Linear Interpolation
const lerp = (start: number, end: number, factor: number) => start + (end - start) * factor;

const GestureOverlay: React.FC<Props> = ({ onGesture, isInPreview }) => {
  const [activeGesture, setActiveGesture] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Window State
  const [isExpanded, setIsExpanded] = useState(true);

  // Draggable Window State
  const [position, setPosition] = useState({ x: 20, y: window.innerHeight - 300 }); 
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const windowPosStartRef = useRef({ x: 0, y: 0 });
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(null);
  
  // --- TRACKING REFS ---
  const lastPalmPos = useRef<{x: number, y: number} | null>(null);
  const wasFist = useRef<boolean>(false);
  
  // Smoothing
  const smoothRot = useRef({ x: 0, y: 0 });

  // Cleanup on unmount
  useEffect(() => {
    return () => stopCamera();
  }, []);

  // Draggable Handlers
  useEffect(() => {
    const handleWindowMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const dx = e.clientX - dragStartRef.current.x;
        const dy = e.clientY - dragStartRef.current.y;
        const newX = Math.max(0, Math.min(window.innerWidth - 220, windowPosStartRef.current.x + dx));
        const newY = Math.max(0, Math.min(window.innerHeight - 40, windowPosStartRef.current.y + dy));
        setPosition({ x: newX, y: newY });
      }
    };
    const handleWindowMouseUp = () => setIsDragging(false);

    if (isDragging) {
      window.addEventListener('mousemove', handleWindowMouseMove);
      window.addEventListener('mouseup', handleWindowMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
    };
  }, [isDragging]);

  const startDrag = (e: React.MouseEvent) => {
    // Prevent drag if clicking the toggle button
    if ((e.target as HTMLElement).closest('button')) return;
    
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    windowPosStartRef.current = { ...position };
  };

  const startCamera = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      await gestureService.initialize();
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 320, height: 240, frameRate: { ideal: 30 } } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadeddata = () => {
            videoRef.current?.play().then(() => {
                setIsCameraActive(true);
                audioService.playFeedbackTone('success');
                predictWebcam();
            }).catch(e => {
                console.error("Play error:", e);
                setErrorMsg("摄像头启动失败");
            });
        };
      }
    } catch (err) {
      console.error("Camera init failed:", err);
      setErrorMsg("无法访问摄像头");
      setIsCameraActive(false);
    } finally {
      setIsLoading(false);
    }
  };

  const stopCamera = () => {
    if (requestRef.current) cancelAnimationFrame(requestRef.current);
    if (videoRef.current && videoRef.current.srcObject) {
       const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
       tracks.forEach(t => t.stop());
       videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
    setActiveGesture(null);
  };

  const predictWebcam = async () => {
    if (!videoRef.current || !canvasRef.current || !gestureService.handLandmarker) return;

    requestRef.current = requestAnimationFrame(predictWebcam);
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (video.videoWidth === 0 || video.videoHeight === 0 || video.paused) return;

    if (canvas.width !== video.videoWidth) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
    }

    const results = gestureService.detect(video);
    
    if (ctx) {
        ctx.save();
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        if (results && results.landmarks) {
            const drawingUtils = new DrawingUtils(ctx);
            for (const landmarks of results.landmarks) {
                drawingUtils.drawConnectors(landmarks, HandLandmarker.HAND_CONNECTIONS, { color: "#00E5FF", lineWidth: 2 });
                drawingUtils.drawLandmarks(landmarks, { color: "#FFFFFF", lineWidth: 1, radius: 3 });
            }

            // --- GESTURE LOGIC START ---
            if (results.landmarks.length > 0) {
                const landmarks = results.landmarks[0]; // Use first hand
                const palmCenter = landmarks[9];
                
                // 1. Detect Hand State
                const isFist = detectFist(landmarks);
                const isOpen = detectOpenPalm(landmarks);
                const isTwoFingers = detectTwoFingers(landmarks); // Index + Middle

                if (isFist) {
                    // --- GRAB (Fist) -> Preview Center ---
                    if (!wasFist.current) {
                        onGesture('Grab');
                        setActiveGesture('预览中心 (Grab)');
                        audioService.playFeedbackTone('click');
                    } else {
                        setActiveGesture('保持抓取 (Hold)');
                    }
                    wasFist.current = true;
                    lastPalmPos.current = null;

                } else if (isOpen) {
                    // --- OPEN PALM -> Release / Exit Preview ---
                    wasFist.current = false;
                    lastPalmPos.current = null;
                    onGesture('Release');
                    setActiveGesture('退出预览 (Release)');

                } else if (isTwoFingers) {
                    // --- TWO FINGERS (Index + Middle) -> Rotate ---
                    wasFist.current = false;

                    // Only rotate if NOT in preview mode
                    if (!isInPreview) {
                        if (lastPalmPos.current) {
                            const dx = palmCenter.x - lastPalmPos.current.x;
                            const dy = palmCenter.y - lastPalmPos.current.y;
                            
                            // Use a smaller deadzone for responsiveness
                            if (Math.abs(dx) > 0.005 || Math.abs(dy) > 0.005) {
                                // Optimized Smoothing
                                smoothRot.current.x = lerp(smoothRot.current.x, dx, 0.4);
                                smoothRot.current.y = lerp(smoothRot.current.y, dy, 0.4);
                                
                                onGesture('Rotate', { dx: -smoothRot.current.x, dy: smoothRot.current.y });
                                setActiveGesture('移动视角 (Move)');
                            }
                        }
                        lastPalmPos.current = { x: palmCenter.x, y: palmCenter.y };
                    } else {
                         setActiveGesture('移动 (Disabled in Preview)');
                    }

                } else {
                    // --- CONTINUOUS ZOOM (Thumb & Index) ---
                    // Used when hand is pinching/spreading
                    wasFist.current = false;
                    lastPalmPos.current = null;

                    const thumb = landmarks[4];
                    const index = landmarks[8];
                    // Calculate absolute distance between tips
                    const dist = Math.hypot(thumb.x - index.x, thumb.y - index.y);

                    // Thresholds based on normalized coordinates (0-1)
                    if (dist < 0.05) {
                        // Close Pinch -> Zoom Out
                        onGesture('ZoomOut');
                        setActiveGesture('缩小 (Zoom Out)');
                    } else if (dist > 0.12) {
                        // Wide Spread (L-Shape) -> Zoom In
                        onGesture('ZoomIn');
                        setActiveGesture('放大 (Zoom In)');
                    } else {
                        setActiveGesture('待机 (Idle)');
                    }
                }
            } else {
                setActiveGesture(null);
                lastPalmPos.current = null;
                wasFist.current = false;
            }
        }
        ctx.restore();
    }
  };

  const detectFist = (landmarks: NormalizedLandmark[]): boolean => {
      const wrist = landmarks[0];
      const isFolded = (tipIdx: number, pipIdx: number) => {
          const tip = landmarks[tipIdx];
          const pip = landmarks[pipIdx];
          return Math.hypot(tip.x - wrist.x, tip.y - wrist.y) < Math.hypot(pip.x - wrist.x, pip.y - wrist.y);
      };
      // Index, Middle, Ring, Pinky folded
      return isFolded(8, 6) && isFolded(12, 10) && isFolded(16, 14) && isFolded(20, 18);
  };

  const detectOpenPalm = (landmarks: NormalizedLandmark[]): boolean => {
      const wrist = landmarks[0];
      const isExtended = (tipIdx: number, pipIdx: number) => {
          const tip = landmarks[tipIdx];
          const pip = landmarks[pipIdx];
          return Math.hypot(tip.x - wrist.x, tip.y - wrist.y) > Math.hypot(pip.x - wrist.x, pip.y - wrist.y);
      };
      
      // RELAXED CHECK: Only require Index(8), Middle(12), Ring(16), Pinky(20) to be extended.
      // Ignore Thumb (4) because it can be tricky to detect extension depending on hand angle.
      // This ensures "Open Palm" reliably triggers "Release".
      return isExtended(8, 6) && isExtended(12, 10) && isExtended(16, 14) && isExtended(20, 18);
  };

  const detectTwoFingers = (landmarks: NormalizedLandmark[]): boolean => {
      const wrist = landmarks[0];
      const isExtended = (tipIdx: number, pipIdx: number) => {
          const tip = landmarks[tipIdx];
          const pip = landmarks[pipIdx];
          return Math.hypot(tip.x - wrist.x, tip.y - wrist.y) > Math.hypot(pip.x - wrist.x, pip.y - wrist.y);
      };
      const isFolded = (tipIdx: number, pipIdx: number) => {
          const tip = landmarks[tipIdx];
          const pip = landmarks[pipIdx];
          return Math.hypot(tip.x - wrist.x, tip.y - wrist.y) < Math.hypot(pip.x - wrist.x, pip.y - wrist.y);
      };

      // Index (8) & Middle (12) Extended
      const indexExt = isExtended(8, 6);
      const middleExt = isExtended(12, 10);
      
      // Ring (16) & Pinky (20) Folded
      const ringFold = isFolded(16, 14);
      const pinkyFold = isFolded(20, 18);

      return indexExt && middleExt && ringFold && pinkyFold;
  }

  return (
    <>
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50">
             {!isCameraActive && !isLoading ? (
                 <button 
                    onClick={startCamera}
                    className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-full border border-white/20 backdrop-blur-md shadow-lg group transition-all"
                 >
                    <Camera size={18} className="group-hover:scale-110 transition-transform"/>
                    <span className="text-sm font-semibold tracking-wide">开启手势控制</span>
                 </button>
             ) : null}
             
             {errorMsg && (
                <div className="mt-2 px-4 py-2 bg-red-500/90 text-white text-sm rounded-lg shadow-xl backdrop-blur animate-in fade-in slide-in-from-top-2 flex items-center gap-2">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse"/>
                    {errorMsg}
                </div>
             )}
        </div>

        <div 
            className={`fixed z-50 flex flex-col items-start gap-0 transition-opacity duration-500 rounded-xl overflow-hidden shadow-2xl border border-slate-700/50 ${isCameraActive ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
            style={{ 
                left: position.x, 
                top: position.y,
                touchAction: 'none'
            }}
        >
            <div 
                onMouseDown={startDrag}
                className="flex items-center justify-between w-56 bg-slate-900/95 backdrop-blur-md px-3 py-2 cursor-move select-none border-b border-white/10"
            >
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
                    <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">Live Cam</span>
                </div>
                <div className="flex items-center gap-2">
                    <button 
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="p-1 hover:bg-slate-700/50 rounded-full text-slate-400 hover:text-white transition-colors"
                    >
                         {isExpanded ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                    </button>
                    <GripHorizontal size={14} className="text-slate-600" />
                </div>
            </div>

            {/* Video Container - Rendered but visually toggled */}
            <div className={`relative w-56 bg-black transition-all duration-300 ${isExpanded ? 'h-40' : 'h-0'}`}>
                {isLoading && isExpanded && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 z-10 gap-2">
                        <RefreshCw className="animate-spin text-cyan-400" size={24} />
                        <span className="text-[10px] text-slate-400">正在初始化引擎...</span>
                    </div>
                )}
                
                {/* Always mount video/canvas to keep loop alive */}
                <video 
                    ref={videoRef} 
                    className={`absolute inset-0 w-full h-full object-cover opacity-50 -scale-x-100 pointer-events-none ${!isExpanded && 'invisible'}`} 
                    autoPlay playsInline muted 
                />
                <canvas 
                    ref={canvasRef} 
                    className={`absolute inset-0 w-full h-full object-cover -scale-x-100 ${!isExpanded && 'invisible'}`} 
                />
                
                <button 
                    onClick={stopCamera}
                    className={`absolute top-2 right-2 p-1.5 bg-black/40 hover:bg-red-500/90 text-white/80 hover:text-white rounded-full transition-all z-20 backdrop-blur-sm ${!isExpanded && 'hidden'}`}
                    title="关闭摄像头"
                >
                    <CameraOff size={12} />
                </button>
            </div>
            
            {/* Footer / Legend - Only visible when expanded */}
            {isExpanded && (
                <>
                    <div className="w-full bg-slate-900/95 backdrop-blur-md px-3 py-2 border-t border-white/10 min-h-[30px] flex items-center justify-center">
                        {activeGesture ? (
                            <div className="flex items-center gap-2 text-cyan-400 animate-in fade-in zoom-in duration-200">
                                <Hand size={14} className="animate-pulse" />
                                <span className="text-xs font-mono font-bold truncate">
                                {activeGesture}
                                </span>
                            </div>
                        ) : (
                            <span className="text-[10px] text-slate-600 italic">等待手势...</span>
                        )}
                    </div>

                    <div className="w-full bg-slate-950/95 backdrop-blur-md px-3 py-2 border-t border-white/5 space-y-1">
                        <div className="flex items-center gap-2 text-[10px] text-slate-400">
                            <MoveDiagonal size={10} className="text-blue-400" />
                            <span>食指+中指: 移动视角</span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400">
                            <Maximize2 size={10} className="text-green-400" />
                            <span>拇指食指开合: 缩放</span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400">
                            <MousePointerClick size={10} className="text-purple-400" />
                            <span>握拳: 预览 | 张开: 退出</span>
                        </div>
                    </div>
                </>
            )}
        </div>
    </>
  );
};

export default GestureOverlay;
