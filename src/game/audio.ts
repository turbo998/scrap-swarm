import type { GameEvent } from "./types";

class ProceduralAudioEngine {
  private ctx: AudioContext | null = null;
  private muted = false;
  private lastShotAt = 0;
  private lastHitAt = 0;

  public isMuted(): boolean {
    return this.muted;
  }

  public setMuted(value: boolean): boolean {
    this.muted = value;
    return this.muted;
  }

  public toggleMute(): boolean {
    this.muted = !this.muted;
    if (!this.muted) {
      this.ensureContext();
      this.playTone(520, 680, 0.07, "triangle", 0.06);
    }
    return this.muted;
  }

  private ensureContext(): AudioContext | null {
    if (this.muted || typeof window === "undefined") return null;
    try {
      const AudioCtor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtor) return null;
      if (!this.ctx) {
        this.ctx = new AudioCtor();
      }
      if (this.ctx.state === "suspended") {
        void this.ctx.resume().catch(() => undefined);
      }
      return this.ctx;
    } catch {
      return null;
    }
  }

  private playTone(
    startFreq: number,
    endFreq: number,
    duration: number,
    type: OscillatorType,
    gainPeak = 0.08,
    delay = 0
  ): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime + delay;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(Math.max(20, startFreq), now);
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), now + duration);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(gainPeak, now + Math.min(0.012, duration * 0.25));
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + duration + 0.01);
    } catch {
      // Ignore Web Audio errors in headless environments
    }
  }

  public playShot(): void {
    const now = typeof performance !== "undefined" ? performance.now() : 0;
    if (now - this.lastShotAt < 55) return;
    this.lastShotAt = now;
    this.playTone(230, 68, 0.085, "triangle", 0.09);
    this.playTone(920, 340, 0.035, "square", 0.035);
  }

  public playPulse(): void {
    this.playTone(155, 42, 0.24, "sine", 0.12);
    this.playTone(580, 190, 0.19, "triangle", 0.055, 0.02);
  }

  public playArc(): void {
    this.playTone(980, 420, 0.07, "sawtooth", 0.055);
    this.playTone(620, 1320, 0.065, "square", 0.04, 0.035);
  }

  public playDash(): void {
    this.playTone(180, 460, 0.11, "sawtooth", 0.075);
    this.playTone(310, 58, 0.18, "triangle", 0.11, 0.05);
  }

  public playHit(critical = false): void {
    const now = typeof performance !== "undefined" ? performance.now() : 0;
    if (now - this.lastHitAt < 40) return;
    this.lastHitAt = now;
    if (critical) {
      this.playTone(680, 1120, 0.07, "triangle", 0.075);
      this.playTone(340, 160, 0.09, "square", 0.05);
    } else {
      this.playTone(420, 180, 0.045, "triangle", 0.04);
    }
  }

  public playHurt(): void {
    this.playTone(135, 48, 0.16, "sawtooth", 0.11);
    this.playTone(320, 190, 0.12, "square", 0.05, 0.02);
  }

  public playKill(isBoss = false): void {
    if (isBoss) {
      this.playTone(220, 45, 0.45, "sawtooth", 0.14);
      this.playTone(523.25, 1046.5, 0.32, "triangle", 0.09, 0.08);
      this.playTone(659.25, 1318.5, 0.38, "triangle", 0.09, 0.18);
    } else {
      this.playTone(290, 92, 0.11, "square", 0.06);
      this.playTone(540, 760, 0.06, "triangle", 0.04, 0.02);
    }
  }

  public playShelterPulse(): void {
    this.playTone(440, 660, 0.14, "sine", 0.08);
    this.playTone(660, 880, 0.18, "triangle", 0.07, 0.07);
  }

  public playLockExpose(): void {
    this.playTone(740, 370, 0.12, "sawtooth", 0.075);
    this.playTone(480, 960, 0.16, "triangle", 0.08, 0.08);
  }

  public playCutin(): void {
    this.playTone(280, 840, 0.13, "triangle", 0.07);
    this.playTone(840, 1120, 0.09, "sine", 0.05, 0.06);
  }

  public playWinFanfare(): void {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, idx) => {
      this.playTone(freq * 0.98, freq, 0.22, "triangle", 0.085, idx * 0.11);
    });
  }

  public handleEvent(event: GameEvent): void {
    switch (event.type) {
      case "shot":
        this.playShot();
        break;
      case "pulse":
        this.playPulse();
        break;
      case "arc":
        this.playArc();
        break;
      case "dash":
        this.playDash();
        break;
      case "hit":
        this.playHit(event.label === "armorBreak");
        break;
      case "hurt":
        this.playHurt();
        break;
      case "kill":
        this.playKill(event.label === "boss");
        break;
      case "shelterPulse":
        this.playShelterPulse();
        break;
      case "lockExpose":
        this.playLockExpose();
        break;
      case "phase":
        if (event.label === "win") this.playWinFanfare();
        break;
      default:
        break;
    }
  }
}

export const soundEngine = new ProceduralAudioEngine();
