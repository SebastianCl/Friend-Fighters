export type MusicTheme = "menu" | "fight" | "result";
export type MusicInstrument = "lead" | "bass" | "kick" | "snare" | "hat";
export interface MusicNote {
  instrument: MusicInstrument;
  pitch?: number;
}

interface MusicTrack {
  bpm: number;
  lead: readonly number[];
  bass: readonly number[];
  loop: boolean;
}

const rest = 0;
const menuLead = [
  69,
  rest,
  72,
  rest,
  76,
  rest,
  72,
  rest,
  67,
  rest,
  69,
  rest,
  72,
  rest,
  rest,
  rest,
  69,
  rest,
  72,
  rest,
  79,
  rest,
  76,
  rest,
  72,
  rest,
  69,
  rest,
  67,
  rest,
  rest,
  rest,
  65,
  rest,
  69,
  rest,
  72,
  rest,
  69,
  rest,
  64,
  rest,
  67,
  rest,
  69,
  rest,
  rest,
  rest,
  67,
  rest,
  71,
  rest,
  74,
  rest,
  71,
  rest,
  69,
  rest,
  67,
  rest,
  64,
  rest,
  rest,
  rest,
];
const menuBass = [
  45,
  rest,
  rest,
  rest,
  52,
  rest,
  rest,
  rest,
  48,
  rest,
  rest,
  rest,
  52,
  rest,
  rest,
  rest,
  45,
  rest,
  rest,
  rest,
  52,
  rest,
  rest,
  rest,
  48,
  rest,
  rest,
  rest,
  52,
  rest,
  rest,
  rest,
  41,
  rest,
  rest,
  rest,
  48,
  rest,
  rest,
  rest,
  45,
  rest,
  rest,
  rest,
  48,
  rest,
  rest,
  rest,
  43,
  rest,
  rest,
  rest,
  50,
  rest,
  rest,
  rest,
  47,
  rest,
  rest,
  rest,
  50,
  rest,
  rest,
  rest,
];
const fightLead = [
  76,
  rest,
  79,
  81,
  rest,
  79,
  76,
  rest,
  74,
  rest,
  76,
  79,
  rest,
  76,
  74,
  rest,
  76,
  rest,
  79,
  83,
  rest,
  81,
  79,
  rest,
  76,
  rest,
  74,
  76,
  rest,
  71,
  74,
  rest,
  72,
  rest,
  76,
  79,
  rest,
  76,
  72,
  rest,
  71,
  rest,
  72,
  76,
  rest,
  72,
  71,
  rest,
  74,
  rest,
  79,
  81,
  rest,
  79,
  74,
  rest,
  71,
  rest,
  74,
  76,
  rest,
  74,
  71,
  rest,
];
const fightBass = [
  40,
  rest,
  40,
  rest,
  47,
  rest,
  40,
  rest,
  40,
  rest,
  43,
  rest,
  47,
  rest,
  40,
  rest,
  40,
  rest,
  40,
  rest,
  47,
  rest,
  43,
  rest,
  40,
  rest,
  43,
  rest,
  47,
  rest,
  40,
  rest,
  36,
  rest,
  36,
  rest,
  43,
  rest,
  36,
  rest,
  36,
  rest,
  40,
  rest,
  43,
  rest,
  36,
  rest,
  38,
  rest,
  38,
  rest,
  45,
  rest,
  38,
  rest,
  38,
  rest,
  42,
  rest,
  45,
  rest,
  38,
  rest,
];
const resultLead = [
  64,
  rest,
  67,
  rest,
  71,
  rest,
  76,
  rest,
  79,
  rest,
  76,
  rest,
  83,
  rest,
  rest,
  rest,
];
const resultBass = [
  40,
  rest,
  rest,
  rest,
  47,
  rest,
  rest,
  rest,
  52,
  rest,
  rest,
  rest,
  40,
  rest,
  rest,
  rest,
];

export const musicTracks: Readonly<Record<MusicTheme, MusicTrack>> = {
  menu: { bpm: 108, lead: menuLead, bass: menuBass, loop: true },
  fight: { bpm: 148, lead: fightLead, bass: fightBass, loop: true },
  result: { bpm: 104, lead: resultLead, bass: resultBass, loop: false },
};

export function musicStepDuration(theme: MusicTheme) {
  return 60 / musicTracks[theme].bpm / 4;
}

export function musicNotesAtStep(theme: MusicTheme, step: number): MusicNote[] {
  const track = musicTracks[theme];
  if (!track.loop && step >= track.lead.length) return [];
  const index = step % track.lead.length;
  const beat = index % 16;
  const notes: MusicNote[] = [];
  if (track.lead[index])
    notes.push({ instrument: "lead", pitch: track.lead[index] });
  if (track.bass[index])
    notes.push({ instrument: "bass", pitch: track.bass[index] });
  if (beat === 0 || beat === 8) notes.push({ instrument: "kick" });
  if (beat === 4 || beat === 12) notes.push({ instrument: "snare" });
  if (theme === "fight" ? beat % 2 === 0 : beat % 4 === 2) {
    notes.push({ instrument: "hat" });
  }
  return notes;
}

export type MusicContextFactory = () => AudioContext | undefined;
function defaultContextFactory(): AudioContext | undefined {
  const Constructor =
    globalThis.AudioContext ??
    (
      globalThis as typeof globalThis & {
        webkitAudioContext?: typeof AudioContext;
      }
    ).webkitAudioContext;
  return Constructor ? new Constructor() : undefined;
}

const midiFrequency = (pitch: number) => 440 * 2 ** ((pitch - 69) / 12);
const lookAheadSeconds = 0.12;
const schedulerIntervalMs = 25;
const transitionSeconds = 0.14;

export class MusicPlayer {
  private context?: AudioContext;
  private master?: GainNode;
  private trackGain?: GainNode;
  private noiseBuffer?: AudioBuffer;
  private timer?: ReturnType<typeof setInterval>;
  private active = new Set<OscillatorNode | AudioBufferSourceNode>();
  private unlocked = false;
  private themeValue: MusicTheme = "menu";
  private pausedValue = false;
  private positionValue = 0;
  private nextStep = 0;
  private anchorTime = 0;

  constructor(
    private mutedValue = false,
    private readonly contextFactory: MusicContextFactory = defaultContextFactory,
  ) {}

  get theme() {
    return this.themeValue;
  }
  get muted() {
    return this.mutedValue;
  }
  get paused() {
    return this.pausedValue;
  }
  get position() {
    return this.positionValue;
  }

  unlock() {
    if (this.unlocked) return;
    try {
      const context = this.ensureContext();
      if (!context) return;
      this.unlocked = true;
      if (context.state === "running") this.start();
      else
        void context
          .resume()
          .then(() => this.start())
          .catch(() => {});
    } catch {
      /* Audio is optional on unsupported devices. */
    }
  }

  setTheme(theme: MusicTheme) {
    if (theme === this.themeValue) return;
    this.themeValue = theme;
    this.positionValue = 0;
    this.stopPlayback();
    this.start();
  }

  setMuted(muted: boolean) {
    if (muted === this.mutedValue) return;
    if (muted) {
      this.freezePosition();
      this.mutedValue = true;
      this.stopPlayback();
    } else {
      this.mutedValue = false;
      if (this.unlocked) this.start();
    }
  }

  setPaused(paused: boolean) {
    if (paused === this.pausedValue) return;
    this.pausedValue = paused;
    this.setTrackVolume();
  }

  private ensureContext() {
    if (!this.context) {
      this.context = this.contextFactory();
      if (!this.context) return undefined;
      this.master = this.context.createGain();
      this.master.gain.setValueAtTime(0.16, this.context.currentTime);
      this.master.connect(this.context.destination);
    }
    return this.context;
  }

  private start() {
    const context = this.context;
    if (
      !this.unlocked ||
      this.mutedValue ||
      !context ||
      context.state !== "running" ||
      this.timer
    )
      return;
    const stepDuration = musicStepDuration(this.themeValue);
    const track = musicTracks[this.themeValue];
    if (!track.loop && this.positionValue >= track.lead.length * stepDuration)
      return;
    this.nextStep = Math.ceil(this.positionValue / stepDuration);
    this.anchorTime = context.currentTime - this.positionValue + 0.02;
    this.trackGain = context.createGain();
    this.trackGain.gain.setValueAtTime(0.0001, context.currentTime);
    this.trackGain.gain.linearRampToValueAtTime(
      this.pausedValue ? 0.22 : 1,
      context.currentTime + transitionSeconds,
    );
    this.trackGain.connect(this.master!);
    this.timer = setInterval(() => this.schedule(), schedulerIntervalMs);
    this.schedule();
  }

  private schedule() {
    const context = this.context;
    if (!context || !this.trackGain || context.state !== "running") return;
    const track = musicTracks[this.themeValue];
    const stepDuration = musicStepDuration(this.themeValue);
    const horizon = context.currentTime + lookAheadSeconds;
    this.nextStep = Math.max(
      this.nextStep,
      Math.floor((context.currentTime - this.anchorTime) / stepDuration),
    );
    while (this.anchorTime + this.nextStep * stepDuration < horizon) {
      if (!track.loop && this.nextStep >= track.lead.length) {
        this.positionValue = track.lead.length * stepDuration;
        this.stopTimer();
        return;
      }
      const when = Math.max(
        context.currentTime,
        this.anchorTime + this.nextStep * stepDuration,
      );
      for (const note of musicNotesAtStep(this.themeValue, this.nextStep)) {
        this.playNote(note, when, stepDuration, this.trackGain);
      }
      this.nextStep++;
    }
    this.positionValue = Math.max(
      this.positionValue,
      context.currentTime - this.anchorTime,
    );
  }

  private playNote(
    note: MusicNote,
    when: number,
    step: number,
    output: GainNode,
  ) {
    const context = this.context!;
    if (note.instrument === "hat" || note.instrument === "snare") {
      const source = context.createBufferSource();
      const filter = context.createBiquadFilter();
      const gain = context.createGain();
      const duration = note.instrument === "hat" ? 0.045 : 0.11;
      source.buffer = this.getNoiseBuffer();
      filter.type = "highpass";
      filter.frequency.setValueAtTime(
        note.instrument === "hat" ? 5_000 : 1_500,
        when,
      );
      source.connect(filter);
      filter.connect(gain);
      gain.connect(output);
      this.envelope(
        gain.gain,
        note.instrument === "hat" ? 0.055 : 0.11,
        when,
        duration,
      );
      this.startSource(source, when, duration);
      return;
    }
    const source = context.createOscillator();
    const gain = context.createGain();
    const duration =
      note.instrument === "kick"
        ? 0.12
        : note.instrument === "bass"
          ? step * 1.6
          : step * 0.85;
    source.type = note.instrument === "bass" ? "triangle" : "square";
    const frequency =
      note.instrument === "kick" ? 125 : midiFrequency(note.pitch!);
    source.frequency.setValueAtTime(frequency, when);
    if (note.instrument === "kick")
      source.frequency.exponentialRampToValueAtTime(45, when + duration);
    source.connect(gain);
    gain.connect(output);
    this.envelope(
      gain.gain,
      note.instrument === "kick"
        ? 0.16
        : note.instrument === "bass"
          ? 0.095
          : 0.055,
      when,
      duration,
    );
    this.startSource(source, when, duration);
  }

  private envelope(
    gain: AudioParam,
    peak: number,
    when: number,
    duration: number,
  ) {
    gain.setValueAtTime(0.0001, when);
    gain.linearRampToValueAtTime(peak, when + 0.005);
    gain.exponentialRampToValueAtTime(0.0001, when + duration);
  }

  private startSource(
    source: OscillatorNode | AudioBufferSourceNode,
    when: number,
    duration: number,
  ) {
    this.active.add(source);
    source.onended = () => {
      this.active.delete(source);
      source.disconnect();
    };
    source.start(when);
    source.stop(when + duration + 0.01);
  }

  private getNoiseBuffer() {
    if (!this.noiseBuffer) {
      const context = this.context!;
      this.noiseBuffer = context.createBuffer(
        1,
        Math.ceil(context.sampleRate * 0.13),
        context.sampleRate,
      );
      const samples = this.noiseBuffer.getChannelData(0);
      let seed = 0x41c6ce57;
      for (let i = 0; i < samples.length; i++) {
        seed ^= seed << 13;
        seed ^= seed >>> 17;
        seed ^= seed << 5;
        samples[i] = (seed >>> 0) / 0x7fffffff - 1;
      }
    }
    return this.noiseBuffer;
  }

  private setTrackVolume() {
    if (!this.context || !this.trackGain) return;
    const now = this.context.currentTime;
    this.trackGain.gain.cancelScheduledValues(now);
    this.trackGain.gain.setValueAtTime(this.trackGain.gain.value, now);
    this.trackGain.gain.linearRampToValueAtTime(
      this.pausedValue ? 0.22 : 1,
      now + transitionSeconds,
    );
  }

  private freezePosition() {
    if (this.context && this.timer) {
      const duration =
        musicTracks[this.themeValue].lead.length *
        musicStepDuration(this.themeValue);
      const elapsed = Math.max(0, this.context.currentTime - this.anchorTime);
      this.positionValue = musicTracks[this.themeValue].loop
        ? elapsed % duration
        : Math.min(elapsed, duration);
    }
  }

  private stopTimer() {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
  }

  private stopPlayback() {
    this.stopTimer();
    if (!this.context || !this.trackGain) return;
    const now = this.context.currentTime;
    const oldGain = this.trackGain;
    oldGain.gain.cancelScheduledValues(now);
    oldGain.gain.setValueAtTime(oldGain.gain.value, now);
    oldGain.gain.linearRampToValueAtTime(0.0001, now + transitionSeconds);
    for (const source of this.active) {
      try {
        source.stop(now + transitionSeconds + 0.01);
      } catch {
        /* Source already ended. */
      }
    }
    this.active.clear();
    this.trackGain = undefined;
    setTimeout(
      () => oldGain.disconnect(),
      Math.ceil((transitionSeconds + 0.05) * 1000),
    );
  }
}
