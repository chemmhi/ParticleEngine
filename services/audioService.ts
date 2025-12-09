

export class AudioService {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private dataArray: Uint8Array | null = null;
  private source: MediaElementAudioSourceNode | null = null;
  private audioElement: HTMLAudioElement | null = null;

  async initialize(audioUrl?: string) {
    // 1. Setup Audio Context if needed
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256; // Performance vs Accuracy balance
      this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
      
      // Connect analyser to destination so we can hear the audio
      this.analyser.connect(this.audioContext.destination);
    }

    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    // 2. Load Audio Source
    if (audioUrl) {
       this.loadSource(audioUrl);
    } else if (!this.audioElement && !this.source) {
       // Microphone fallback only if no audio element is currently set
       try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const source = this.audioContext.createMediaStreamSource(stream);
            source.connect(this.analyser!);
       } catch (e) {
            console.error("Mic access denied or failed", e);
       }
    }
  }

  loadSource(url: string) {
      // Cleanup existing source and element
      if (this.source) {
          this.source.disconnect();
          this.source = null;
      }
      if (this.audioElement) {
          this.audioElement.pause();
          this.audioElement.removeAttribute('src'); 
          this.audioElement.load();
          this.audioElement = null;
      }

      // Create new Audio element
      const audio = new Audio();
      // IMPORTANT: crossOrigin must be set BEFORE src for CORS to work with Web Audio API
      audio.crossOrigin = "anonymous";
      audio.src = url;
      audio.loop = true;
      audio.preload = "auto";
      
      audio.addEventListener('error', (e) => {
          const target = e.target as HTMLAudioElement;
          console.error(`Audio Load Error. Code: ${target.error?.code}, Message: ${target.error?.message}`);
          // Prevent playing broken element
          if (this.audioElement === target) {
             this.audioElement = null;
          }
      });

      this.audioElement = audio;

      // Create MediaElementSource
      // Note: We need to wait for the context to be ready, which it is by now.
      if (this.audioContext && this.analyser) {
          try {
            this.source = this.audioContext.createMediaElementSource(this.audioElement);
            this.source.connect(this.analyser);
          } catch(e) {
            console.error("Failed to create MediaElementSource:", e);
          }
      }
  }

  play() {
    if (this.audioContext?.state === 'suspended') {
      this.audioContext.resume();
    }
    
    if (this.audioElement) {
        if (this.audioElement.error) {
            console.error("Cannot play: Audio element has error", this.audioElement.error);
            return;
        }
        
        const playPromise = this.audioElement.play();
        if (playPromise !== undefined) {
            playPromise.catch(e => {
                console.error("Play failed:", e);
            });
        }
    }
  }

  pause() {
    this.audioElement?.pause();
  }

  // New method for UI feedback beeps
  playFeedbackTone(type: 'success' | 'error' | 'click' = 'click') {
    if (!this.audioContext) return;
    if (this.audioContext.state === 'suspended') this.audioContext.resume();

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    const now = this.audioContext.currentTime;

    if (type === 'success') {
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(800, now);
        oscillator.frequency.exponentialRampToValueAtTime(1200, now + 0.1);
        gainNode.gain.setValueAtTime(0.1, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
        oscillator.start(now);
        oscillator.stop(now + 0.2);
    } else if (type === 'error') {
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(150, now);
        gainNode.gain.setValueAtTime(0.1, now);
        gainNode.gain.linearRampToValueAtTime(0.01, now + 0.3);
        oscillator.start(now);
        oscillator.stop(now + 0.3);
    } else {
        // Simple click/blip for gesture recognition
        oscillator.type = 'triangle';
        oscillator.frequency.setValueAtTime(600, now);
        gainNode.gain.setValueAtTime(0.05, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        oscillator.start(now);
        oscillator.stop(now + 0.1);
    }
  }

  getFrequencyData() {
    if (!this.analyser || !this.dataArray) return { bass: 0, mid: 0, treble: 0, frequency: new Uint8Array(0) };
    
    this.analyser.getByteFrequencyData(this.dataArray);
    
    // Simple frequency banding
    const length = this.dataArray.length;
    const bassRange = this.dataArray.slice(0, Math.floor(length * 0.1));
    const midRange = this.dataArray.slice(Math.floor(length * 0.1), Math.floor(length * 0.5));
    const trebleRange = this.dataArray.slice(Math.floor(length * 0.5), length);

    const avg = (arr: Uint8Array) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

    return {
      frequency: this.dataArray,
      bass: avg(bassRange) / 255,
      mid: avg(midRange) / 255,
      treble: avg(trebleRange) / 255,
    };
  }
}

export const audioService = new AudioService();
