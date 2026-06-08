/**
 * Sokoban Game - Audio Synthesizer (Web Audio API)
 * Generates custom 8-bit sound effects on-the-fly.
 */

class SokobanAudio {
  constructor() {
    this.audioCtx = null;
    this.audioInitialized = false;
    this.isMuted = false;
  }

  // 初始化音效 (由于浏览器安全限制，必须在用户操作后启动 AudioContext)
  init() {
    if (this.audioInitialized) return;
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
        this.audioInitialized = true;
      }
    } catch (e) {
      console.warn("Web Audio API is not supported in this browser.", e);
    }
  }

  // 设置静音状态
  setMuted(muted) {
    this.isMuted = muted;
    if (!muted) {
      this.init();
    }
  }

  // 播放合成音效
  playSound(type) {
    this.init();
    if (this.isMuted || !this.audioCtx) return;

    // 如果 audioContext 被挂起，尝试恢复它
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }

    const now = this.audioCtx.currentTime;
    
    if (type === 'walk') {
      // 走路音效：清脆可爱的小皮鞋踏地声（带高音木鱼敲击感）
      const osc = this.audioCtx.createOscillator();
      const gainNode = this.audioCtx.createGain();
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(450, now);
      osc.frequency.exponentialRampToValueAtTime(150, now + 0.06);
      
      gainNode.gain.setValueAtTime(0.5, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.06);
      
      osc.connect(gainNode);
      gainNode.connect(this.audioCtx.destination);
      
      osc.start(now);
      osc.stop(now + 0.07);
    } 
    else if (type === 'push') {
      // 推箱子音效：木滑行声
      const osc1 = this.audioCtx.createOscillator();
      const osc2 = this.audioCtx.createOscillator();
      const gainNode = this.audioCtx.createGain();
      const filter = this.audioCtx.createBiquadFilter();
      
      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(110, now);
      osc1.frequency.linearRampToValueAtTime(50, now + 0.25);

      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(80, now);
      osc2.frequency.linearRampToValueAtTime(40, now + 0.25);
      
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(350, now);
      filter.frequency.exponentialRampToValueAtTime(150, now + 0.25);
      
      gainNode.gain.setValueAtTime(0.7, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
      
      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(this.audioCtx.destination);
      
      osc1.start(now);
      osc1.stop(now + 0.26);
      osc2.start(now);
      osc2.stop(now + 0.26);
    } 
    else if (type === 'victory') {
      // 胜利音效：一段欢快、昂扬的复古 8-bit 经典红白机（NES）过关旋律！
      const melody = [
        { f: 659.25, d: 0.10 }, // E5
        { f: 783.99, d: 0.10 }, // G5
        { f: 1046.50, d: 0.10 }, // C6
        { f: 1318.51, d: 0.10 }, // E6
        { f: 1174.66, d: 0.10 }, // D6
        { f: 1046.50, d: 0.15 }, // C6
        { f: 1567.98, d: 0.35 }  // G6
      ];
      
      let startTime = now;
      melody.forEach((note) => {
        const osc = this.audioCtx.createOscillator();
        const gainNode = this.audioCtx.createGain();
        
        osc.type = 'square';
        osc.frequency.setValueAtTime(note.f, startTime);
        
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(0.35, startTime + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + note.d - 0.01);
        
        osc.connect(gainNode);
        gainNode.connect(this.audioCtx.destination);
        
        osc.start(startTime);
        osc.stop(startTime + note.d);
        
        // 伴奏低音
        const subOsc = this.audioCtx.createOscillator();
        const subGain = this.audioCtx.createGain();
        subOsc.type = 'triangle';
        subOsc.frequency.setValueAtTime(note.f / 2, startTime);
        
        subGain.gain.setValueAtTime(0, startTime);
        subGain.gain.linearRampToValueAtTime(0.25, startTime + 0.01);
        subGain.gain.exponentialRampToValueAtTime(0.001, startTime + note.d - 0.01);
        
        subOsc.connect(subGain);
        subGain.connect(this.audioCtx.destination);
        
        subOsc.start(startTime);
        subOsc.stop(startTime + note.d);
        
        startTime += note.d + 0.02;
      });
    } 
    else if (type === 'undo') {
      // 撤销音效：滑稽卡通弹回音
      const osc = this.audioCtx.createOscillator();
      const gainNode = this.audioCtx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(500, now + 0.15);
      
      gainNode.gain.setValueAtTime(0.45, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
      
      osc.connect(gainNode);
      gainNode.connect(this.audioCtx.destination);
      
      osc.start(now);
      osc.stop(now + 0.16);
    }
  }
}
