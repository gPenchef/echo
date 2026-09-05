import type { Settings } from './persistence';
export class Audio {
  context?: AudioContext;
  master?: GainNode;
  ambient?: GainNode;
  constructor(public settings: Settings) {}
  unlock() {
    try {
      if (!this.context) {
        this.context = new AudioContext(); this.master = this.context.createGain(); this.master.connect(this.context.destination);
        this.ambient = this.context.createGain(); this.ambient.connect(this.master);
        for (const frequency of [55, 82.41, 110.15]) {
          const osc = this.context.createOscillator(); osc.frequency.value = frequency; osc.type = 'sine'; osc.connect(this.ambient); osc.start();
        }
      }
      if (this.context.state === 'suspended') void this.context.resume().catch(() => {});
      this.sync();
    } catch { /* Audio is optional when blocked by browser policy. */ }
  }
  sync(paused = false) {
    if (this.context && this.master && this.ambient) {
      this.master.gain.setTargetAtTime(this.settings.volume * 0.3, this.context.currentTime, 0.03);
      this.ambient.gain.setTargetAtTime(this.settings.ambience && !paused ? 0.06 : 0, this.context.currentTime, 0.1);
    }
  }
  play(kind: string) {
    if (!this.context || !this.master || !this.settings.volume) return;
    const ctx = this.context, osc = ctx.createOscillator(), gain = ctx.createGain();
    const tones: Record<string, [number, number, number]> = { shot: [450, 130, .065], impact: [170, 60, .09], signal: [370, 740, .16], reset: [800, 70, .4], death: [180, 35, .35], complete: [440, 880, .7], warning: [700, 600, .08], teleport: [120, 900, .2] };
    const [from, to, duration] = tones[kind] ?? tones.signal;
    osc.type = kind === 'shot' ? 'triangle' : 'sine'; osc.frequency.setValueAtTime(from, ctx.currentTime); osc.frequency.exponentialRampToValueAtTime(to, ctx.currentTime + duration);
    gain.gain.setValueAtTime(.0001, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(.25, ctx.currentTime + .01); gain.gain.exponentialRampToValueAtTime(.0001, ctx.currentTime + duration);
    osc.connect(gain); gain.connect(this.master); osc.start(); osc.stop(ctx.currentTime + duration + .02); osc.onended = () => { osc.disconnect(); gain.disconnect(); };
  }
}
