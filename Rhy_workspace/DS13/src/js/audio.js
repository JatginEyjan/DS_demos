// DS13 - 声音系统

class AudioSystem {
    constructor() {
        this.audioContext = null;
        this.masterGain = null;
        this.enabled = false;
    }

    init() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.masterGain = this.audioContext.createGain();
            this.masterGain.gain.value = CONFIG.AUDIO.volume;
            this.masterGain.connect(this.audioContext.destination);
            this.enabled = true;
        } catch (e) {
            console.warn('Web Audio API not supported');
            this.enabled = false;
        }
    }

    // 播放心跳声（绿眼接近时）
    playHeartbeat(distance) {
        if (!this.enabled) return;

        const rate = Math.max(0.5, 2 - distance * 0.3); // 距离越近越快
        
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        
        osc.frequency.value = 60; // 低频心跳
        gain.gain.setValueAtTime(0.3, this.audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.5);
        
        osc.connect(gain);
        gain.connect(this.masterGain);
        
        osc.start();
        osc.stop(this.audioContext.currentTime + 0.5);

        // 循环播放
        setTimeout(() => {
            if (greenEyeSystem.state !== 'dormant') {
                this.playHeartbeat(distance);
            }
        }, 1000 / rate);
    }

    // 播放低语（绿眼很近时）
    playWhisper() {
        if (!this.enabled) return;

        const phrases = ['看这里', '回头', '我在你身后', '别跑'];
        // 实际实现需要语音合成或音频文件
        
        // 使用Web Speech API作为替代
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(phrases[Math.floor(Math.random() * phrases.length)]);
            utterance.rate = 0.7;
            utterance.pitch = 0.5;
            utterance.volume = 0.3;
            speechSynthesis.speak(utterance);
        }
    }

    // 播放绿眼出现音效
    playGreenEyeSound() {
        if (!this.enabled) return;

        // 高频尖叫
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(800, this.audioContext.currentTime);
        osc.frequency.exponentialRampToValueAtTime(100, this.audioContext.currentTime + 0.5);
        
        gain.gain.setValueAtTime(0.3, this.audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.5);
        
        osc.connect(gain);
        gain.connect(this.masterGain);
        
        osc.start();
        osc.stop(this.audioContext.currentTime + 0.5);
    }

    // 播放扫描音效
    playScanSound() {
        if (!this.enabled) return;

        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, this.audioContext.currentTime);
        osc.frequency.exponentialRampToValueAtTime(800, this.audioContext.currentTime + 0.1);
        
        gain.gain.setValueAtTime(0.1, this.audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1);
        
        osc.connect(gain);
        gain.connect(this.masterGain);
        
        osc.start();
        osc.stop(this.audioContext.currentTime + 0.1);
    }

    // 播放挖掘音效
    playDigSound() {
        if (!this.enabled) return;

        // 噪音模拟挖掘
        const bufferSize = this.audioContext.sampleRate * 0.2;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        
        const noise = this.audioContext.createBufferSource();
        noise.buffer = buffer;
        
        const gain = this.audioContext.createGain();
        gain.gain.setValueAtTime(0.2, this.audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.2);
        
        noise.connect(gain);
        gain.connect(this.masterGain);
        
        noise.start();
    }
}

// 音频实例
const audioSystem = new AudioSystem();
