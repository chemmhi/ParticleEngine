
import React, { useState, useRef } from 'react';
import { LayerData, LayerType, ParticleLayerData, BlendMode, ColorMode, AlbumLayerData, SceneSettings, ImageParticleLayerData, TextParticleLayerData, ParticleShapeType, FrameStyle } from '../types';
import { Trash2, Eye, EyeOff, Layers, Settings, Image as ImageIcon, Music, Sliders, Upload, ImagePlus, Type as TypeIcon, X, Mountain, TreePine, Zap, Snowflake, Circle, Square, Star, Lock, Frame, BoxSelect, Box } from 'lucide-react';
import { audioService } from '../services/audioService';
import { SCENE_PRESETS } from '../presets';

interface Props {
  layers: LayerData[];
  selectedLayerId: string | null;
  onSelectLayer: (id: string) => void;
  onUpdateLayer: (id: string, updates: Partial<LayerData>) => void;
  onDeleteLayer: (id: string) => void;
  onAddLayer: (type: LayerType) => void;
  audioActive: boolean;
  audioReady: boolean;
  onToggleAudio: () => void;
  onAudioFileLoaded: () => void;
  sceneSettings: SceneSettings;
  onUpdateScene: (updates: Partial<SceneSettings>) => void;
  onPresetView: (view: 'front' | 'top' | 'side') => void;
  onLoadPreset: (presetId: string) => void;
}

const ControlPanel: React.FC<Props> = ({
  layers,
  selectedLayerId,
  onSelectLayer,
  onUpdateLayer,
  onDeleteLayer,
  onAddLayer,
  audioActive,
  audioReady,
  onToggleAudio,
  onAudioFileLoaded,
  sceneSettings,
  onUpdateScene,
  onPresetView,
  onLoadPreset
}) => {
  const selectedLayer = layers.find(l => l.id === selectedLayerId);
  const [activeTab, setActiveTab] = useState<'layers' | 'scene'>('layers');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const albumImageInputRef = useRef<HTMLInputElement>(null);
  const [albumUrlInput, setAlbumUrlInput] = useState('');

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        const url = URL.createObjectURL(file);
        audioService.initialize(url).then(() => {
            onAudioFileLoaded();
        });
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && selectedLayerId) {
        const url = URL.createObjectURL(file);
        e.target.value = '';
        onUpdateLayer(selectedLayerId, { imageUrl: url });
    }
  };

  const handleAlbumImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0 && selectedLayer && selectedLayer.type === LayerType.ALBUM) {
          const newUrls: string[] = [];
          Array.from(files).forEach(file => {
              newUrls.push(URL.createObjectURL(file));
          });
          const currentImages = (selectedLayer as AlbumLayerData).images;
          onUpdateLayer(selectedLayer.id, { images: [...currentImages, ...newUrls] });
          e.target.value = '';
      }
  };

  const addAlbumImageUrl = () => {
      if (albumUrlInput && selectedLayer && selectedLayer.type === LayerType.ALBUM) {
          const currentImages = (selectedLayer as AlbumLayerData).images;
          onUpdateLayer(selectedLayer.id, { images: [...currentImages, albumUrlInput] });
          setAlbumUrlInput('');
      }
  };

  const removeAlbumImage = (index: number) => {
      if (selectedLayer && selectedLayer.type === LayerType.ALBUM) {
          const currentImages = (selectedLayer as AlbumLayerData).images;
          const newImages = currentImages.filter((_, i) => i !== index);
          onUpdateLayer(selectedLayer.id, { images: newImages });
      }
  };

  const updateAlbumFrame = (updates: Partial<AlbumLayerData['frameConfig']>) => {
      if (selectedLayer && selectedLayer.type === LayerType.ALBUM) {
          const layer = selectedLayer as AlbumLayerData;
          onUpdateLayer(layer.id, {
              frameConfig: { ...layer.frameConfig, ...updates }
          });
      }
  };

  return (
    <div className="absolute top-0 left-0 h-full w-80 bg-slate-900/90 backdrop-blur-md border-r border-slate-700 flex flex-col text-slate-100 z-10 shadow-2xl">
      <div className="p-4 border-b border-slate-700">
        <h1 className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent mb-4">
          NEBULA ENGINE
        </h1>
        
        <div className="flex gap-2 bg-slate-800 p-1 rounded-lg">
            <button 
                onClick={() => setActiveTab('layers')}
                className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-md text-sm transition-colors ${activeTab === 'layers' ? 'bg-slate-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
                <Layers size={14} /> 图层
            </button>
            <button 
                onClick={() => setActiveTab('scene')}
                className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-md text-sm transition-colors ${activeTab === 'scene' ? 'bg-slate-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
                <Sliders size={14} /> 场景
            </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {activeTab === 'layers' && (
            <div className="p-4 space-y-6">
                {/* Audio Controls */}
                <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-semibold text-slate-400 uppercase">音频引擎</span>
                        <div className={`w-2 h-2 rounded-full ${audioActive ? 'bg-green-500 animate-pulse' : 'bg-slate-600'}`} />
                    </div>
                    <div className="flex gap-2">
                         <button 
                            onClick={onToggleAudio}
                            // Allow toggle if it's active (to stop) OR if audio is ready
                            disabled={!audioReady && !audioActive}
                            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded text-sm font-medium transition-colors 
                                ${!audioReady && !audioActive 
                                    ? 'bg-slate-700/50 text-slate-500 cursor-not-allowed' 
                                    : audioActive 
                                        ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' 
                                        : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'}`}
                        >
                            <Music size={16} /> {audioActive ? '停止' : '播放'}
                        </button>
                        <button 
                            onClick={() => fileInputRef.current?.click()}
                            className="p-2 bg-slate-700 hover:bg-slate-600 rounded text-slate-300"
                            title="上传音频"
                        >
                            <Upload size={16} />
                        </button>
                        <input 
                            ref={fileInputRef}
                            type="file" 
                            accept="audio/*" 
                            className="hidden" 
                            onChange={handleFileUpload}
                        />
                    </div>
                    {!audioReady && <p className="text-[10px] text-slate-500 mt-1 text-center">请上传音频文件</p>}
                </div>

                {/* Layer List */}
                <div>
                    <div className="flex justify-between items-center mb-2">
                        <h2 className="text-xs font-semibold text-slate-400 uppercase">图层列表</h2>
                        <div className="flex gap-1">
                            <button onClick={() => onAddLayer(LayerType.PARTICLE)} className="p-1.5 hover:bg-slate-700 rounded text-cyan-400 bg-slate-800/50" title="添加粒子">
                                <Layers size={14} />
                            </button>
                            <button onClick={() => onAddLayer(LayerType.TEXT_PARTICLE)} className="p-1.5 hover:bg-slate-700 rounded text-green-400 bg-slate-800/50" title="添加文字">
                                <TypeIcon size={14} />
                            </button>
                            <button onClick={() => onAddLayer(LayerType.IMAGE_PARTICLE)} className="p-1.5 hover:bg-slate-700 rounded text-pink-400 bg-slate-800/50" title="添加图片粒子">
                                <ImagePlus size={14} />
                            </button>
                            <button onClick={() => onAddLayer(LayerType.ALBUM)} className="p-1.5 hover:bg-slate-700 rounded text-purple-400 bg-slate-800/50" title="添加相册">
                                <ImageIcon size={14} />
                            </button>
                        </div>
                    </div>
                    <div className="space-y-2">
                        {layers.map(layer => (
                            <div 
                            key={layer.id}
                            className={`flex items-center justify-between p-2.5 rounded border transition-all ${
                                selectedLayerId === layer.id 
                                ? 'bg-slate-800 border-cyan-500/50 shadow-lg shadow-cyan-900/20' 
                                : 'bg-slate-800/30 border-transparent hover:bg-slate-800'
                            }`}
                            onClick={() => onSelectLayer(layer.id)}
                            >
                            <div className="flex items-center gap-2 truncate">
                                {layer.type === LayerType.PARTICLE && <Layers size={14} className="text-cyan-400" />}
                                {layer.type === LayerType.IMAGE_PARTICLE && <ImagePlus size={14} className="text-pink-400" />}
                                {layer.type === LayerType.TEXT_PARTICLE && <TypeIcon size={14} className="text-green-400" />}
                                {layer.type === LayerType.ALBUM && <ImageIcon size={14} className="text-purple-400" />}
                                <span className="text-sm truncate font-medium text-slate-200">{layer.name}</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <button 
                                onClick={(e) => { e.stopPropagation(); onUpdateLayer(layer.id, { visible: !layer.visible }); }}
                                className="p-1.5 text-slate-500 hover:text-white transition-colors"
                                >
                                {layer.visible ? <Eye size={14} /> : <EyeOff size={14} />}
                                </button>
                                {layer.locked ? (
                                    <button 
                                        disabled
                                        className="p-1.5 text-slate-600 cursor-not-allowed"
                                        title="锁定图层"
                                    >
                                        <Lock size={14} />
                                    </button>
                                ) : (
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); onDeleteLayer(layer.id); }}
                                        className="p-1.5 text-slate-500 hover:text-red-400 transition-colors"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                )}
                            </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Layer Properties */}
                {selectedLayer && (
                    <div className="border-t border-slate-700 pt-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <h2 className="text-xs font-semibold text-slate-400 uppercase mb-3 flex items-center gap-2">
                            <Settings size={14} /> 设置
                            {selectedLayer.locked && <Lock size={12} className="text-slate-500" />}
                        </h2>
                        
                        <div className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-xs text-slate-500">名称</label>
                                <input 
                                    type="text" 
                                    value={selectedLayer.name} 
                                    onChange={(e) => onUpdateLayer(selectedLayer.id, { name: e.target.value })}
                                    className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-sm focus:border-cyan-500 outline-none text-slate-200"
                                />
                            </div>

                            <div className="space-y-1">
                                <div className="flex justify-between text-xs text-slate-500">
                                    <span>不透明度</span>
                                    <span>{Math.round(selectedLayer.opacity * 100)}%</span>
                                </div>
                                <input 
                                    type="range" min="0" max="1" step="0.01"
                                    value={selectedLayer.opacity} 
                                    onChange={(e) => onUpdateLayer(selectedLayer.id, { opacity: parseFloat(e.target.value) })}
                                    className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                                />
                            </div>

                            <div className="space-y-1">
                                <div className="flex justify-between text-xs text-slate-500">
                                    <span>整体缩放</span>
                                    <span>{selectedLayer.scale.toFixed(1)}x</span>
                                </div>
                                <input 
                                    type="range" min="0.1" max="5" step="0.1"
                                    value={selectedLayer.scale} 
                                    onChange={(e) => onUpdateLayer(selectedLayer.id, { scale: parseFloat(e.target.value) })}
                                    className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                                />
                            </div>

                             {/* XYZ POSITION CONTROL */}
                             <div className="space-y-2">
                                <span className="text-xs text-slate-500">位置 (X, Y, Z)</span>
                                <div className="grid grid-cols-3 gap-2">
                                     <div className="space-y-1">
                                        <input 
                                            type="number" step="0.5"
                                            value={selectedLayer.position[0]} 
                                            onChange={(e) => onUpdateLayer(selectedLayer.id, { position: [parseFloat(e.target.value), selectedLayer.position[1], selectedLayer.position[2]] })}
                                            className="w-full bg-slate-950 border border-slate-700 rounded px-1 py-1 text-xs text-center text-slate-300"
                                            placeholder="X"
                                        />
                                        <div className="text-[10px] text-slate-600 text-center">X</div>
                                    </div>
                                    <div className="space-y-1">
                                        <input 
                                            type="number" step="0.5"
                                            value={selectedLayer.position[1]} 
                                            onChange={(e) => onUpdateLayer(selectedLayer.id, { position: [selectedLayer.position[0], parseFloat(e.target.value), selectedLayer.position[2]] })}
                                            className="w-full bg-slate-950 border border-slate-700 rounded px-1 py-1 text-xs text-center text-slate-300"
                                            placeholder="Y"
                                        />
                                        <div className="text-[10px] text-slate-600 text-center">Y</div>
                                    </div>
                                    <div className="space-y-1">
                                        <input 
                                            type="number" step="0.5"
                                            value={selectedLayer.position[2]} 
                                            onChange={(e) => onUpdateLayer(selectedLayer.id, { position: [selectedLayer.position[0], selectedLayer.position[1], parseFloat(e.target.value)] })}
                                            className="w-full bg-slate-950 border border-slate-700 rounded px-1 py-1 text-xs text-center text-slate-300"
                                            placeholder="Z"
                                        />
                                        <div className="text-[10px] text-slate-600 text-center">Z</div>
                                    </div>
                                </div>
                            </div>

                            {/* PARTICLE SPECIFIC */}
                            {selectedLayer.type === LayerType.PARTICLE && (
                                <>
                                    <div className="space-y-1">
                                        <div className="flex justify-between text-xs text-slate-500">
                                            <span>数量</span>
                                            <span>{(selectedLayer as ParticleLayerData).count}</span>
                                        </div>
                                        <input 
                                            type="range" min="100" max="20000" step="100"
                                            value={(selectedLayer as ParticleLayerData).count} 
                                            onChange={(e) => onUpdateLayer(selectedLayer.id, { count: parseInt(e.target.value) })}
                                            className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <div className="flex justify-between text-xs text-slate-500">
                                            <span>粒子大小</span>
                                            <span>{(selectedLayer as ParticleLayerData).size.toFixed(2)}</span>
                                        </div>
                                        <input 
                                            type="range" min="0.01" max="3.0" step="0.01"
                                            value={(selectedLayer as ParticleLayerData).size} 
                                            onChange={(e) => onUpdateLayer(selectedLayer.id, { size: parseFloat(e.target.value) })}
                                            className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <div className="flex justify-between text-xs text-slate-500">
                                            <span>大小随机</span>
                                            <span>{((selectedLayer as ParticleLayerData).sizeVariation || 0).toFixed(2)}</span>
                                        </div>
                                        <input 
                                            type="range" min="0" max="1.0" step="0.05"
                                            value={(selectedLayer as ParticleLayerData).sizeVariation || 0} 
                                            onChange={(e) => onUpdateLayer(selectedLayer.id, { sizeVariation: parseFloat(e.target.value) })}
                                            className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="space-y-1">
                                            <label className="text-xs text-slate-500">颜色</label>
                                            <input 
                                                type="color" 
                                                value={(selectedLayer as ParticleLayerData).color} 
                                                onChange={(e) => onUpdateLayer(selectedLayer.id, { color: e.target.value })}
                                                className="w-full h-8 rounded bg-transparent border border-slate-700 cursor-pointer"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs text-slate-500">模式</label>
                                            <select 
                                                value={(selectedLayer as ParticleLayerData).colorMode}
                                                onChange={(e) => onUpdateLayer(selectedLayer.id, { colorMode: e.target.value as ColorMode })}
                                                className="w-full h-8 bg-slate-950 border border-slate-700 rounded px-1 text-xs outline-none"
                                            >
                                                <option value={ColorMode.SINGLE}>单色</option>
                                                <option value={ColorMode.RANDOM}>随机</option>
                                            </select>
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-1">
                                        <label className="text-xs text-slate-500">分布形状</label>
                                        <select 
                                            value={(selectedLayer as ParticleLayerData).shape}
                                            onChange={(e) => onUpdateLayer(selectedLayer.id, { shape: e.target.value as any })}
                                            className="w-full h-8 bg-slate-950 border border-slate-700 rounded px-1 text-xs outline-none"
                                        >
                                            <option value="sphere">云雾 (球体)</option>
                                            <option value="cube">盒子 (立方体)</option>
                                            <option value="cone">树形 (螺旋)</option>
                                            <option value="grid">地形 (网格)</option>
                                        </select>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-xs text-slate-500">粒子3D形状</label>
                                        <div className="flex bg-slate-950 border border-slate-700 rounded p-1 gap-1">
                                            {['circle', 'square', 'star'].map((shape) => (
                                                <button
                                                    key={shape}
                                                    onClick={() => onUpdateLayer(selectedLayer.id, { particleShape: shape as ParticleShapeType })}
                                                    className={`flex-1 flex items-center justify-center py-1 rounded text-xs transition-colors ${
                                                        (selectedLayer as ParticleLayerData).particleShape === shape 
                                                            ? 'bg-slate-700 text-white' 
                                                            : 'text-slate-500 hover:text-slate-300'
                                                    }`}
                                                    title={shape === 'circle' ? '球形' : shape === 'square' ? '方形' : '星形'}
                                                >
                                                    {shape === 'circle' && <Circle size={14} />}
                                                    {shape === 'square' && <Square size={14} />}
                                                    {shape === 'star' && <Star size={14} />}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between p-2 bg-slate-800/50 rounded border border-slate-700">
                                        <label className="text-xs text-slate-400">音频响应</label>
                                        <input 
                                            type="checkbox"
                                            checked={(selectedLayer as ParticleLayerData).audioReactive}
                                            onChange={(e) => onUpdateLayer(selectedLayer.id, { audioReactive: e.target.checked })}
                                            className="accent-cyan-500 w-4 h-4"
                                        />
                                    </div>
                                </>
                            )}

                             {/* TEXT PARTICLE SPECIFIC */}
                             {selectedLayer.type === LayerType.TEXT_PARTICLE && (
                                <>
                                    <div className="space-y-1">
                                        <label className="text-xs text-slate-500">内容 (支持 Emoji)</label>
                                        <input 
                                            type="text" 
                                            value={(selectedLayer as TextParticleLayerData).text} 
                                            onChange={(e) => onUpdateLayer(selectedLayer.id, { text: e.target.value })}
                                            className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-300"
                                            placeholder="输入文字或表情..."
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="space-y-1">
                                            <label className="text-xs text-slate-500">颜色</label>
                                            <input 
                                                type="color" 
                                                value={(selectedLayer as TextParticleLayerData).color} 
                                                onChange={(e) => onUpdateLayer(selectedLayer.id, { color: e.target.value })}
                                                className="w-full h-8 rounded bg-transparent border border-slate-700 cursor-pointer"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs text-slate-500">字体大小</label>
                                            <input 
                                                type="number" 
                                                value={(selectedLayer as TextParticleLayerData).fontSize}
                                                onChange={(e) => onUpdateLayer(selectedLayer.id, { fontSize: parseInt(e.target.value) })}
                                                className="w-full h-8 bg-slate-950 border border-slate-700 rounded px-2 text-xs outline-none text-white"
                                            />
                                        </div>
                                    </div>
                                    
                                    {/* Added Particle Size for Text Layer */}
                                    <div className="space-y-1">
                                        <div className="flex justify-between text-xs text-slate-500">
                                            <span>粒子大小</span>
                                            <span>{(selectedLayer as TextParticleLayerData).size.toFixed(2)}</span>
                                        </div>
                                        <input 
                                            type="range" min="0.01" max="1.0" step="0.01"
                                            value={(selectedLayer as TextParticleLayerData).size} 
                                            onChange={(e) => onUpdateLayer(selectedLayer.id, { size: parseFloat(e.target.value) })}
                                            className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-green-500"
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <div className="flex justify-between text-xs text-slate-500">
                                            <span>密度</span>
                                            <span>{(selectedLayer as TextParticleLayerData).pixelDensity}</span>
                                        </div>
                                        <input 
                                            type="range" min="1" max="10" step="1"
                                            value={(selectedLayer as TextParticleLayerData).pixelDensity} 
                                            onChange={(e) => onUpdateLayer(selectedLayer.id, { pixelDensity: parseInt(e.target.value) })}
                                            className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-green-500"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <div className="flex justify-between text-xs text-slate-500">
                                            <span>3D 深度</span>
                                            <span>{(selectedLayer as TextParticleLayerData).thickness}</span>
                                        </div>
                                        <input 
                                            type="range" min="0" max="20" step="1"
                                            value={(selectedLayer as TextParticleLayerData).thickness} 
                                            onChange={(e) => onUpdateLayer(selectedLayer.id, { thickness: parseInt(e.target.value) })}
                                            className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-green-500"
                                        />
                                    </div>

                                    {/* Added Particle Shape for Text Layer */}
                                    <div className="space-y-1">
                                        <label className="text-xs text-slate-500">粒子3D形状</label>
                                        <div className="flex bg-slate-950 border border-slate-700 rounded p-1 gap-1">
                                            {['circle', 'square', 'star'].map((shape) => (
                                                <button
                                                    key={shape}
                                                    onClick={() => onUpdateLayer(selectedLayer.id, { particleShape: shape as ParticleShapeType })}
                                                    className={`flex-1 flex items-center justify-center py-1 rounded text-xs transition-colors ${
                                                        (selectedLayer as TextParticleLayerData).particleShape === shape 
                                                            ? 'bg-slate-700 text-white' 
                                                            : 'text-slate-500 hover:text-slate-300'
                                                    }`}
                                                    title={shape === 'circle' ? '球形' : shape === 'square' ? '方形' : '星形'}
                                                >
                                                    {shape === 'circle' && <Circle size={14} />}
                                                    {shape === 'square' && <Square size={14} />}
                                                    {shape === 'star' && <Star size={14} />}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </>
                             )}

                             {/* IMAGE PARTICLE SPECIFIC */}
                             {selectedLayer.type === LayerType.IMAGE_PARTICLE && (
                                <>
                                    <div className="space-y-1">
                                        <label className="text-xs text-slate-500">图片来源</label>
                                        <div className="flex gap-2">
                                            <input 
                                                type="text" 
                                                value={(selectedLayer as ImageParticleLayerData).imageUrl} 
                                                onChange={(e) => onUpdateLayer(selectedLayer.id, { imageUrl: e.target.value })}
                                                className="flex-1 bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-300"
                                                placeholder="输入 URL..."
                                            />
                                            <button 
                                                onClick={() => imageInputRef.current?.click()}
                                                className="p-1.5 bg-slate-700 hover:bg-slate-600 rounded text-slate-300 transition-colors"
                                                title="上传本地图片"
                                            >
                                                <Upload size={14} />
                                            </button>
                                            <input 
                                                ref={imageInputRef}
                                                type="file" 
                                                accept="image/*" 
                                                className="hidden" 
                                                onChange={handleImageUpload}
                                            />
                                        </div>
                                    </div>

                                    {/* Added Color for Image Layer */}
                                    <div className="space-y-1">
                                        <label className="text-xs text-slate-500">颜色 (染色)</label>
                                        <input 
                                            type="color" 
                                            value={(selectedLayer as ImageParticleLayerData).color || '#ffffff'} 
                                            onChange={(e) => onUpdateLayer(selectedLayer.id, { color: e.target.value })}
                                            className="w-full h-8 rounded bg-transparent border border-slate-700 cursor-pointer"
                                        />
                                    </div>

                                    {/* Added Particle Size for Image Layer */}
                                    <div className="space-y-1">
                                        <div className="flex justify-between text-xs text-slate-500">
                                            <span>粒子大小</span>
                                            <span>{(selectedLayer as ImageParticleLayerData).size.toFixed(2)}</span>
                                        </div>
                                        <input 
                                            type="range" min="0.01" max="1.0" step="0.01"
                                            value={(selectedLayer as ImageParticleLayerData).size} 
                                            onChange={(e) => onUpdateLayer(selectedLayer.id, { size: parseFloat(e.target.value) })}
                                            className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-pink-500"
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <div className="flex justify-between text-xs text-slate-500">
                                            <span>密度</span>
                                            <span>{(selectedLayer as ImageParticleLayerData).pixelDensity}</span>
                                        </div>
                                        <input 
                                            type="range" min="1" max="10" step="1"
                                            value={(selectedLayer as ImageParticleLayerData).pixelDensity} 
                                            onChange={(e) => onUpdateLayer(selectedLayer.id, { pixelDensity: parseInt(e.target.value) })}
                                            className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-pink-500"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <div className="flex justify-between text-xs text-slate-500">
                                            <span>3D 深度 (浮雕)</span>
                                            <span>{(selectedLayer as ImageParticleLayerData).thickness}</span>
                                        </div>
                                        <input 
                                            type="range" min="0" max="20" step="1"
                                            value={(selectedLayer as ImageParticleLayerData).thickness} 
                                            onChange={(e) => onUpdateLayer(selectedLayer.id, { thickness: parseInt(e.target.value) })}
                                            className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-pink-500"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <div className="flex justify-between text-xs text-slate-500">
                                            <span>背景剔除 (阈值)</span>
                                            <span>{(selectedLayer as ImageParticleLayerData).threshold ?? 0.1}</span>
                                        </div>
                                        <input 
                                            type="range" min="0" max="0.95" step="0.05"
                                            value={(selectedLayer as ImageParticleLayerData).threshold ?? 0.1} 
                                            onChange={(e) => onUpdateLayer(selectedLayer.id, { threshold: parseFloat(e.target.value) })}
                                            className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-pink-500"
                                        />
                                    </div>

                                    {/* Added Particle Shape for Image Layer */}
                                    <div className="space-y-1">
                                        <label className="text-xs text-slate-500">粒子3D形状</label>
                                        <div className="flex bg-slate-950 border border-slate-700 rounded p-1 gap-1">
                                            {['circle', 'square', 'star'].map((shape) => (
                                                <button
                                                    key={shape}
                                                    onClick={() => onUpdateLayer(selectedLayer.id, { particleShape: shape as ParticleShapeType })}
                                                    className={`flex-1 flex items-center justify-center py-1 rounded text-xs transition-colors ${
                                                        (selectedLayer as ImageParticleLayerData).particleShape === shape 
                                                            ? 'bg-slate-700 text-white' 
                                                            : 'text-slate-500 hover:text-slate-300'
                                                    }`}
                                                    title={shape === 'circle' ? '球形' : shape === 'square' ? '方形' : '星形'}
                                                >
                                                    {shape === 'circle' && <Circle size={14} />}
                                                    {shape === 'square' && <Square size={14} />}
                                                    {shape === 'star' && <Star size={14} />}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </>
                             )}

                            {/* ALBUM SPECIFIC */}
                            {selectedLayer.type === LayerType.ALBUM && (
                                <div className="space-y-4">
                                    <div className="space-y-1">
                                        <label className="text-xs text-slate-500">布局</label>
                                        <select 
                                            value={(selectedLayer as AlbumLayerData).layout}
                                            onChange={(e) => onUpdateLayer(selectedLayer.id, { layout: e.target.value as any })}
                                            className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-sm outline-none"
                                        >
                                            <option value="spiral">螺旋</option>
                                            <option value="grid">网格</option>
                                            <option value="sphere">球形</option>
                                            <option value="random">随机</option>
                                        </select>
                                    </div>
                                    
                                    <div className="space-y-2 pt-2 border-t border-slate-700">
                                        <h3 className="text-xs font-semibold text-slate-400 uppercase flex items-center gap-2">
                                            <Frame size={12} /> 相框设计
                                        </h3>
                                        
                                        <div className="space-y-1">
                                            <label className="text-xs text-slate-500">风格</label>
                                            <select 
                                                value={(selectedLayer as AlbumLayerData).frameConfig?.style || 'none'}
                                                onChange={(e) => updateAlbumFrame({ style: e.target.value as FrameStyle })}
                                                className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-xs outline-none"
                                            >
                                                <option value="none">无边框</option>
                                                <option value="minimal">极简</option>
                                                <option value="wood">木纹</option>
                                                <option value="metal">金属</option>
                                            </select>
                                        </div>

                                        {(selectedLayer as AlbumLayerData).frameConfig?.style !== 'none' && (
                                            <>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div className="space-y-1">
                                                        <label className="text-xs text-slate-500">颜色</label>
                                                        <input 
                                                            type="color" 
                                                            value={(selectedLayer as AlbumLayerData).frameConfig?.color || '#ffffff'}
                                                            onChange={(e) => updateAlbumFrame({ color: e.target.value })}
                                                            className="w-full h-6 rounded bg-transparent border border-slate-700 cursor-pointer"
                                                        />
                                                    </div>
                                                    <div className="space-y-1 flex items-center gap-2 pt-4">
                                                        <input 
                                                            type="checkbox"
                                                            checked={(selectedLayer as AlbumLayerData).frameConfig?.shadow}
                                                            onChange={(e) => updateAlbumFrame({ shadow: e.target.checked })}
                                                            className="accent-purple-500 w-3 h-3"
                                                        />
                                                        <label className="text-xs text-slate-500">阴影</label>
                                                    </div>
                                                </div>

                                                <div className="space-y-1">
                                                    <div className="flex justify-between text-xs text-slate-500">
                                                        <span>边框宽度</span>
                                                        <span>{((selectedLayer as AlbumLayerData).frameConfig?.borderWidth || 0).toFixed(2)}</span>
                                                    </div>
                                                    <input 
                                                        type="range" min="0.05" max="1" step="0.05"
                                                        value={(selectedLayer as AlbumLayerData).frameConfig?.borderWidth || 0.1} 
                                                        onChange={(e) => updateAlbumFrame({ borderWidth: parseFloat(e.target.value) })}
                                                        className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                                                    />
                                                </div>

                                                <div className="space-y-1">
                                                    <div className="flex justify-between text-xs text-slate-500">
                                                        <span>内边距</span>
                                                        <span>{((selectedLayer as AlbumLayerData).frameConfig?.padding || 0).toFixed(2)}</span>
                                                    </div>
                                                    <input 
                                                        type="range" min="0" max="0.5" step="0.05"
                                                        value={(selectedLayer as AlbumLayerData).frameConfig?.padding || 0} 
                                                        onChange={(e) => updateAlbumFrame({ padding: parseFloat(e.target.value) })}
                                                        className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                                                    />
                                                </div>

                                                <div className="space-y-1">
                                                    <div className="flex justify-between text-xs text-slate-500">
                                                        <span>圆角</span>
                                                        <span>{((selectedLayer as AlbumLayerData).frameConfig?.radius || 0).toFixed(2)}</span>
                                                    </div>
                                                    <input 
                                                        type="range" min="0" max="1" step="0.05"
                                                        value={(selectedLayer as AlbumLayerData).frameConfig?.radius || 0} 
                                                        onChange={(e) => updateAlbumFrame({ radius: parseFloat(e.target.value) })}
                                                        className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                                                    />
                                                </div>
                                            </>
                                        )}
                                    </div>

                                    <div className="space-y-2 pt-2 border-t border-slate-700">
                                        <label className="text-xs text-slate-500">图片列表</label>
                                        <div className="flex gap-2 mb-2">
                                            <input 
                                                type="text" 
                                                value={albumUrlInput}
                                                onChange={(e) => setAlbumUrlInput(e.target.value)}
                                                className="flex-1 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs"
                                                placeholder="图片 URL..."
                                            />
                                            <button 
                                                onClick={addAlbumImageUrl}
                                                className="px-2 bg-slate-700 rounded text-xs hover:bg-slate-600"
                                            >
                                                添加
                                            </button>
                                            <button 
                                                onClick={() => albumImageInputRef.current?.click()}
                                                className="px-2 bg-slate-700 rounded text-xs hover:bg-slate-600"
                                                title="上传图片 (可多选)"
                                            >
                                                <Upload size={12} />
                                            </button>
                                            <input 
                                                ref={albumImageInputRef}
                                                type="file" 
                                                accept="image/*" 
                                                multiple
                                                className="hidden" 
                                                onChange={handleAlbumImageUpload}
                                            />
                                        </div>
                                        
                                        <div className="max-h-40 overflow-y-auto space-y-1 pr-1 scrollbar-thin">
                                            {(selectedLayer as AlbumLayerData).images.map((img, idx) => (
                                                <div key={idx} className="flex items-center gap-2 bg-slate-800 p-1 rounded">
                                                    <img src={img} className="w-6 h-6 object-cover rounded" alt="" />
                                                    <span className="flex-1 text-[10px] truncate text-slate-400">{img.substring(0, 20)}...</span>
                                                    <button 
                                                        onClick={() => removeAlbumImage(idx)}
                                                        className="text-slate-500 hover:text-red-400"
                                                    >
                                                        <X size={12} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        )}

        {activeTab === 'scene' && (
             <div className="p-4 space-y-6">
                <div className="space-y-4">
                     <h2 className="text-xs font-semibold text-slate-400 uppercase">添加 3D 模型</h2>
                     <div className="grid grid-cols-2 gap-2">
                         {SCENE_PRESETS.map(preset => (
                             <button 
                                key={preset.id}
                                onClick={() => onLoadPreset(preset.id)}
                                className="flex flex-col items-center justify-center gap-2 p-3 bg-slate-800 hover:bg-slate-700 rounded border border-slate-700 transition-colors"
                             >
                                 {preset.id === 'snow_mountains' && <Mountain size={20} className="text-blue-300" />}
                                 <span className="text-xs font-medium">{preset.name}</span>
                             </button>
                         ))}
                     </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-slate-700">
                    <h2 className="text-xs font-semibold text-slate-400 uppercase">环境设置</h2>
                    
                    <div className="space-y-1">
                        <label className="text-xs text-slate-500">背景颜色</label>
                        <input 
                            type="color" 
                            value={sceneSettings.backgroundColor} 
                            onChange={(e) => onUpdateScene({ backgroundColor: e.target.value })}
                            className="w-full h-8 rounded bg-transparent border border-slate-700 cursor-pointer"
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs text-slate-500">雾气浓度</label>
                        <input 
                            type="range" min="0" max="100" step="1"
                            value={sceneSettings.fogDensity} 
                            onChange={(e) => onUpdateScene({ fogDensity: parseInt(e.target.value) })}
                            className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs text-slate-500">光照强度</label>
                        <input 
                            type="range" min="0" max="2" step="0.1"
                            value={sceneSettings.ambientLightIntensity} 
                            onChange={(e) => onUpdateScene({ ambientLightIntensity: parseFloat(e.target.value) })}
                            className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-yellow-500"
                        />
                    </div>
                </div>
             </div>
        )}
      </div>
    </div>
  );
};

export default ControlPanel;
