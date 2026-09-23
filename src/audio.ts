import type { Combat, Hit, MoveSetDefinition } from "./combat";

export const soundCues = [
  "ui-confirm",
  "attack-punch",
  "attack-kick",
  "attack-special",
  "attack-grab",
  "hit-light",
  "hit-medium",
  "hit-heavy",
  "hit-throw",
  "block",
  "jump",
  "land",
  "round-start",
  "round-end",
  "victory",
  "pause",
  "resume",
] as const;

export type SoundCue = (typeof soundCues)[number];
type AttackKind = keyof MoveSetDefinition;

export interface ToneVoice {
  kind: "tone";
  wave: OscillatorType;
  frequency: number;
  endFrequency?: number;
  gain: number;
  duration: number;
  delay?: number;
}

export interface NoiseVoice {
  kind: "noise";
  filter: BiquadFilterType;
  frequency: number;
  gain: number;
  duration: number;
  delay?: number;
}

export type SoundVoice = ToneVoice | NoiseVoice;
export interface SoundDefinition {
  voices: readonly SoundVoice[];
}

const tone = (
  frequency: number,
  endFrequency: number,
  gain: number,
  duration: number,
  delay = 0,
  wave: OscillatorType = "square",
): ToneVoice => ({
  kind: "tone",
  wave,
  frequency,
  endFrequency,
  gain,
  duration,
  delay,
});

const noise = (
  frequency: number,
  gain: number,
  duration: number,
  delay = 0,
  filter: BiquadFilterType = "bandpass",
): NoiseVoice => ({
  kind: "noise",
  filter,
  frequency,
  gain,
  duration,
  delay,
});

export const soundDefinitions: Readonly<Record<SoundCue, SoundDefinition>> = {
  "ui-confirm": { voices: [tone(620, 880, 0.045, 0.06)] },
  "attack-punch": {
    voices: [noise(1_500, 0.04, 0.07), tone(190, 105, 0.035, 0.07)],
  },
  "attack-kick": {
    voices: [noise(1_050, 0.055, 0.11), tone(145, 72, 0.05, 0.11)],
  },
  "attack-special": {
    voices: [tone(430, 72, 0.075, 0.2, 0, "sawtooth"), noise(720, 0.06, 0.18)],
  },
  "attack-grab": {
    voices: [noise(800, 0.045, 0.12), tone(175, 95, 0.04, 0.12)],
  },
  "hit-light": {
    voices: [tone(165, 54, 0.1, 0.1), noise(1_350, 0.05, 0.08)],
  },
  "hit-medium": {
    voices: [tone(118, 42, 0.13, 0.15), noise(920, 0.07, 0.13)],
  },
  "hit-heavy": {
    voices: [tone(84, 28, 0.16, 0.23, 0, "sawtooth"), noise(610, 0.09, 0.2)],
  },
  "hit-throw": {
    voices: [tone(74, 24, 0.15, 0.25, 0, "sawtooth"), noise(480, 0.11, 0.2)],
  },
  block: {
    voices: [
      tone(980, 480, 0.075, 0.09),
      noise(2_100, 0.05, 0.07, 0, "highpass"),
    ],
  },
  jump: { voices: [tone(220, 490, 0.05, 0.13)] },
  land: {
    voices: [tone(96, 40, 0.1, 0.13), noise(480, 0.055, 0.1)],
  },
  "round-start": {
    voices: [
      tone(330, 330, 0.055, 0.08),
      tone(440, 440, 0.06, 0.08, 0.1),
      tone(660, 660, 0.07, 0.12, 0.2),
    ],
  },
  "round-end": {
    voices: [tone(520, 520, 0.065, 0.1), tone(350, 350, 0.07, 0.14, 0.11)],
  },
  victory: {
    voices: [
      tone(330, 330, 0.06, 0.12),
      tone(440, 440, 0.065, 0.12, 0.12),
      tone(550, 550, 0.07, 0.12, 0.24),
      tone(880, 880, 0.085, 0.2, 0.36),
    ],
  },
  pause: { voices: [tone(440, 220, 0.055, 0.12)] },
  resume: { voices: [tone(220, 440, 0.055, 0.12)] },
};

export function attackCue(kind: AttackKind): SoundCue {
  return `attack-${kind}`;
}

export function hitCue(hit: Pick<Hit, "attackKind" | "blocked">): SoundCue {
  if (hit.blocked) return "block";
  if (hit.attackKind === "grab") return "hit-throw";
  if (hit.attackKind === "special") return "hit-heavy";
  return hit.attackKind === "kick" ? "hit-medium" : "hit-light";
}

export interface CombatSoundState {
  phase: Combat["phase"];
  fighters: readonly {
    airborne: boolean;
    attackId: number | null;
    attackKind: AttackKind | null;
  }[];
}

export function captureCombatSoundState(
  combat: Pick<Combat, "phase" | "fighters">,
): CombatSoundState {
  return {
    phase: combat.phase,
    fighters: combat.fighters.map((fighter) => ({
      airborne: fighter.y > 0 || fighter.vy > 0,
      attackId: fighter.attack?.id ?? null,
      attackKind: fighter.attack?.kind ?? null,
    })),
  };
}

export function combatTransitionCues(
  before: CombatSoundState,
  after: CombatSoundState,
): SoundCue[] {
  const cues: SoundCue[] = [];
  const resettingRound = before.phase === "round" && after.phase === "fight";
  if (!resettingRound) {
    after.fighters.forEach((fighter, index) => {
      const previous = before.fighters[index];
      if (
        fighter.attackId !== null &&
        fighter.attackKind !== null &&
        fighter.attackId !== previous?.attackId
      ) {
        cues.push(attackCue(fighter.attackKind));
      }
      if (!previous?.airborne && fighter.airborne) cues.push("jump");
      if (previous?.airborne && !fighter.airborne) cues.push("land");
    });
  }
  if (before.phase === "fight" && after.phase === "round") {
    cues.push("round-end");
  } else if (before.phase === "fight" && after.phase === "over") {
    cues.push("victory");
  } else if (before.phase === "round" && after.phase === "fight") {
    cues.push("round-start");
  }
  return cues;
}

export type AudioContextFactory = () => AudioContext | undefined;

function defaultAudioContextFactory(): AudioContext | undefined {
  const AudioContextConstructor =
    globalThis.AudioContext ??
    (
      globalThis as typeof globalThis & {
        webkitAudioContext?: typeof AudioContext;
      }
    ).webkitAudioContext;
  return AudioContextConstructor ? new AudioContextConstructor() : undefined;
}

function fillDeterministicNoise(channel: Float32Array) {
  let state = 0x5f3759df;
  for (let index = 0; index < channel.length; index++) {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    channel[index] = ((state >>> 0) / 0x7fffffff - 1) * 0.82;
  }
}

export class SoundEffects {
  private context?: AudioContext;
  private master?: GainNode;
  private noiseBuffer?: AudioBuffer;

  constructor(
    private mutedValue = false,
    private readonly contextFactory: AudioContextFactory = defaultAudioContextFactory,
  ) {}

  get muted() {
    return this.mutedValue;
  }

  setMuted(muted: boolean) {
    this.mutedValue = muted;
  }

  play(cue: SoundCue): boolean {
    if (this.mutedValue) return false;
    try {
      const context = this.ensureContext();
      if (!context || !this.master) return false;
      if (context.state === "suspended") void context.resume().catch(() => {});
      for (const voice of soundDefinitions[cue].voices) {
        if (voice.kind === "tone") this.playTone(context, voice);
        else this.playNoise(context, voice);
      }
      return true;
    } catch {
      return false;
    }
  }

  private ensureContext() {
    if (!this.context) {
      this.context = this.contextFactory();
      if (!this.context) return undefined;
      this.master = this.context.createGain();
      this.master.gain.setValueAtTime(0.42, this.context.currentTime);
      this.master.connect(this.context.destination);
    }
    return this.context;
  }

  private playTone(context: AudioContext, voice: ToneVoice) {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const start = context.currentTime + (voice.delay ?? 0);
    const end = start + voice.duration;
    oscillator.type = voice.wave;
    oscillator.frequency.setValueAtTime(voice.frequency, start);
    oscillator.frequency.exponentialRampToValueAtTime(
      Math.max(1, voice.endFrequency ?? voice.frequency),
      end,
    );
    this.shapeGain(gain.gain, voice.gain, start, end);
    oscillator.connect(gain);
    gain.connect(this.master!);
    oscillator.start(start);
    oscillator.stop(end + 0.01);
  }

  private playNoise(context: AudioContext, voice: NoiseVoice) {
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    const start = context.currentTime + (voice.delay ?? 0);
    const end = start + voice.duration;
    source.buffer = this.getNoiseBuffer(context);
    filter.type = voice.filter;
    filter.frequency.setValueAtTime(voice.frequency, start);
    this.shapeGain(gain.gain, voice.gain, start, end);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.master!);
    source.start(start);
    source.stop(end + 0.01);
  }

  private shapeGain(
    parameter: AudioParam,
    peak: number,
    start: number,
    end: number,
  ) {
    parameter.setValueAtTime(0.0001, start);
    parameter.linearRampToValueAtTime(peak, start + 0.006);
    parameter.exponentialRampToValueAtTime(0.0001, end);
  }

  private getNoiseBuffer(context: AudioContext) {
    if (!this.noiseBuffer) {
      this.noiseBuffer = context.createBuffer(
        1,
        Math.ceil(context.sampleRate * 0.25),
        context.sampleRate,
      );
      fillDeterministicNoise(this.noiseBuffer.getChannelData(0));
    }
    return this.noiseBuffer;
  }
}
