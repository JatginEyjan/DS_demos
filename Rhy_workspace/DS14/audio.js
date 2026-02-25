// DS14 - Web Audio API 声音系统

class AudioManager {
    constructor() {
        this.ctx = null;
        this.heartbeatOsc = null;
        this.heartbeatGain = null;
        this.isPlaying = false;
        this.init();
    }

    init() {
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();
        } catch (e) {
            console.warn('Web Audio API not supported');
        }
    }

    // 挖掘音效
    playDig() {
        if (!this.ctx) return;
        
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = 'square';
        osc.frequency.setValueAtTime(100, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(50, this.ctx.currentTime + 0.1);
        
        gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);
        
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        
        osc.start();
        osc.stop(this.ctx.currentTime + 0.1);
    }

    // 心跳声（根据绿眼数量调整速度）
    playHeartbeat(count = 1) {
        if (!this.ctx || this.isPlaying) return;
        
        this.isPlaying = true;
        const interval = Math.max(0.3, 1.0 - (count * 0.2)); // 绿眼越多越快
        
        const beat = () => {
            if (!this.isPlaying) return;
            
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            
            osc.type = 'sine';
            osc.frequency.setValueAtTime(60, this.ctx.currentTime);
            
            gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);
            
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            
            osc.start();
            osc.stop(this.ctx.currentTime + 0.15);
            
            setTimeout(beat, interval * 1000);
        };
        
        beat();
    }

    // 更新心跳速度
    updateHeartbeat(count) {
        // 停止当前心跳，以新的速度重新开始
        this.stopHeartbeat();
        if (count > 0) {
            this.playHeartbeat(count);
        }
    }

    stopHeartbeat() {
        this.isPlaying = false;
    }

    // 幻听（低SAN时出现）
    playHallucination() {
        if (!this.ctx) return;
        
        // 创建一个不和谐的声音
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc1.type = 'sawtooth';
        osc2.type = 'square';
        osc1.frequency.setValueAtTime(200, this.ctx.currentTime);
        osc2.frequency.setValueAtTime(210, this.ctx.currentTime); // 轻微失调
        
        gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 2);
        
        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(this.ctx.destination);
        
        osc1.start();
        osc2.start();
        osc1.stop(this.ctx.currentTime + 2);
        osc2.stop(this.ctx.currentTime + 2);
    }

    // 绿眼出现音效
    playGreenEyeSpawn() {
        if (!this.ctx) return;
        
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(800, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.5);
        
        gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.5);
        
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        
        osc.start();
        osc.stop(this.ctx.currentTime + 0.5);
    }
}
