class SteadybarTimingOnsetProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    const config = options.processorOptions || {};
    this.threshold = Math.max(0.001, Number(config.threshold) || 0.08);
    this.rearmRatio = 0.45;
    this.cooldownFrames = Math.max(1, Math.round((Number(config.cooldownMs) || 45) * sampleRate / 1000));
    this.cooldown = 0;
    this.armed = true;
    this.levelPeak = 0;
    this.levelFrames = 0;
  }
  process(inputs) {
    const input = inputs[0];
    const channel = input && input[0];
    if (!channel) return true;
    for (let i = 0; i < channel.length; i++) {
      const level = Math.abs(channel[i]);
      if (level > this.levelPeak) this.levelPeak = level;
      this.levelFrames++;
      if (this.cooldown > 0) this.cooldown--;
      if (!this.armed && level < this.threshold * this.rearmRatio && this.cooldown <= 0) this.armed = true;
      if (this.armed && this.cooldown <= 0 && level >= this.threshold) {
        this.port.postMessage({type:'hit',time:(currentFrame + i) / sampleRate,strength:level});
        this.armed = false;
        this.cooldown = this.cooldownFrames;
      }
      if (this.levelFrames >= 1024) {
        this.port.postMessage({type:'level',peak:this.levelPeak});
        this.levelPeak = 0;
        this.levelFrames = 0;
      }
    }
    return true;
  }
}
registerProcessor('steadybar-timing-onset', SteadybarTimingOnsetProcessor);
