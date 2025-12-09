export class AudioService {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private dataArray: Uint8Array | null = null;
  private source: MediaElementAudioSourceNode | null = null;
  private audioElement: HTMLAudioElement | null = null;

  async initialize(audioUrl?: string) {
    if (this.audioContext) return;

    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 256; // Performance vs Accuracy balance
    this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);

    if (audioUrl) {
      this.audioElement = new Audio(audioUrl);
      this.audioElement.crossOrigin = "anonymous";
      this.audioElement.loop = true;
      
      this.audioElement.addEventListener('error', (e) => {
          console.error("Audio Load Error: ", this.audioElement?.error, e);
      });

      this.source = this.audioContext.createMediaElementSource(this.audioElement);
      this.source.connect(this.analyser);
      this.analyser.connect(this.audioContext.destination);
    } else {
        // Microphone fallback (for demo purposes if no URL provided, though we focus on file play here)
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const source = this.audioContext.createMediaStreamSource(stream);
            source.connect(this.analyser);
        } catch (e) {
            console.error("Mic access denied or failed", e);
        }
    }
  }

  play() {
    if (this.audioContext?.state === 'suspended') {
      this.audioContext.resume();
    }
    this.audioElement?.play().catch(e => console.error("Play failed:", e));
  }

  pause() {
    this.audioElement?.pause();
  }

  getFrequencyData() {
    if (!this.analyser || !this.dataArray) return { bass: 0, mid: 0, treble: 0, frequency: new Uint8Array(0) };
    
    this.analyser.getByteFrequencyData(this.dataArray);
    
    // Simple frequency banding
    const length = this.dataArray.length;
    const bassRange = this.dataArray.slice(0, length * 0.1);
    const midRange = this.dataArray.slice(length * 0.1, length * 0.5);
    const trebleRange = this.dataArray.slice(length * 0.5, length);

    const avg = (arr: Uint8Array) => arr.reduce((a, b) => a + b, 0) / (arr.length || 1);

    return {
      frequency: this.dataArray,
      bass: avg(bassRange) / 255,
      mid: avg(midRange) / 255,
      treble: avg(trebleRange) / 255,
    };
  }
}

export const audioService = new AudioService();