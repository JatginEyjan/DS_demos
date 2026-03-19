// Audio system for DS16 - Silence Convention
// Uses Web Audio API for procedural sound generation

export class AudioSystem {
  constructor(scene) {
    this.scene = scene;
    this.context = null;
    this.enabled = false;
    this.initAudio();
  }

  initAudio() {
    try {
      this.context = new (window.AudioContext || window.webkitAudioContext)();
      this.enabled = true;
    } catch (e) {
      console.warn('Web Audio API not supported');
    }
  }

  // Low frequency rumble for pressure warning (>80)
  playPressureRumble(intensity = 0.5) {
    if (!this.enabled || !this.context) return;
    
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(40, this.context.currentTime); // Low freq
    osc.frequency.exponentialRampToValueAtTime(20, this.context.currentTime + 0.5);
    
    gain.gain.setValueAtTime(0.1 * intensity, this.context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.context.currentTime + 0.5);
    
    osc.connect(gain);
    gain.connect(this.context.destination);
    
    osc.start();
    osc.stop(this.context.currentTime + 0.5);
  }

  // Typewriter click for UI
  playClick() {
    if (!this.enabled || !this.context) return;
    
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    
    osc.type = 'square';
    osc.frequency.setValueAtTime(800, this.context.currentTime);
    
    gain.gain.setValueAtTime(0.05, this.context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.context.currentTime + 0.05);
    
    osc.connect(gain);
    gain.connect(this.context.destination);
    
    osc.start();
    osc.stop(this.context.currentTime + 0.05);
  }

  // Explosion sound
  playExplosion() {
    if (!this.enabled || !this.context) return;
    
    const bufferSize = this.context.sampleRate * 0.5; // 0.5 seconds
    const buffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
    }
    
    const noise = this.context.createBufferSource();
    noise.buffer = buffer;
    
    const filter = this.context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 100;
    
    const gain = this.context.createGain();
    gain.gain.setValueAtTime(0.3, this.context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.context.currentTime + 0.5);
    
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.context.destination);
    
    noise.start();
  }

  // Gas release sound (low rumble with modulation)
  playGasRelease() {
    if (!this.enabled || !this.context) return;
    
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    const lfo = this.context.createOscillator();
    const lfoGain = this.context.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(60, this.context.currentTime);
    
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(5, this.context.currentTime); // 5Hz modulation
    lfoGain.gain.setValueAtTime(20, this.context.currentTime);
    
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    
    gain.gain.setValueAtTime(0.1, this.context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.context.currentTime + 1);
    
    osc.connect(gain);
    gain.connect(this.context.destination);
    
    osc.start();
    lfo.start();
    osc.stop(this.context.currentTime + 1);
    lfo.stop(this.context.currentTime + 1);
  }

  // Alert/alarm sound for inspection
  playAlert() {
    if (!this.enabled || !this.context) return;
    
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    
    osc.type = 'square';
    osc.frequency.setValueAtTime(440, this.context.currentTime);
    osc.frequency.setValueAtTime(880, this.context.currentTime + 0.1);
    osc.frequency.setValueAtTime(440, this.context.currentTime + 0.2);
    
    gain.gain.setValueAtTime(0.1, this.context.currentTime);
    gain.gain.setValueAtTime(0.1, this.context.currentTime + 0.2);
    gain.gain.exponentialRampToValueAtTime(0.001, this.context.currentTime + 0.5);
    
    osc.connect(gain);
    gain.connect(this.context.destination);
    
    osc.start();
    osc.stop(this.context.currentTime + 0.5);
  }
}
