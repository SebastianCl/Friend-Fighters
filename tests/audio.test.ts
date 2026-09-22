import { describe, expect, it, vi } from "vitest";
import {
  SoundEffects,
  attackCue,
  combatTransitionCues,
  hitCue,
  soundCues,
  soundDefinitions,
  type CombatSoundState,
} from "../src/audio";

const fighter = (
  airborne = false,
  attackId: number | null = null,
  attackKind: "punch" | "kick" | "special" | null = null,
) => ({ airborne, attackId, attackKind });

const state = (
  phase: CombatSoundState["phase"] = "fight",
  first = fighter(),
  second = fighter(),
): CombatSoundState => ({ phase, fighters: [first, second] });

class FakeAudioParam {
  values: number[] = [];
  setValueAtTime(value: number) {
    this.values.push(value);
  }
  linearRampToValueAtTime(value: number) {
    this.values.push(value);
  }
  exponentialRampToValueAtTime(value: number) {
    this.values.push(value);
  }
}

class FakeNode {
  connect = vi.fn();
}

class FakeGain extends FakeNode {
  gain = new FakeAudioParam();
}

class FakeOscillator extends FakeNode {
  type: OscillatorType = "sine";
  frequency = new FakeAudioParam();
  start = vi.fn();
  stop = vi.fn();
}

class FakeFilter extends FakeNode {
  type: BiquadFilterType = "lowpass";
  frequency = new FakeAudioParam();
}

class FakeBufferSource extends FakeNode {
  buffer: AudioBuffer | null = null;
  start = vi.fn();
  stop = vi.fn();
}

class FakeAudioContext {
  currentTime = 1;
  sampleRate = 8_000;
  state: AudioContextState = "suspended";
  destination = new FakeNode();
  resume = vi.fn().mockResolvedValue(undefined);
  gains: FakeGain[] = [];
  oscillators: FakeOscillator[] = [];
  sources: FakeBufferSource[] = [];
  noiseChannels: Float32Array[] = [];

  createGain() {
    const gain = new FakeGain();
    this.gains.push(gain);
    return gain;
  }
  createOscillator() {
    const oscillator = new FakeOscillator();
    this.oscillators.push(oscillator);
    return oscillator;
  }
  createBiquadFilter() {
    return new FakeFilter();
  }
  createBufferSource() {
    const source = new FakeBufferSource();
    this.sources.push(source);
    return source;
  }
  createBuffer(_channels: number, length: number) {
    const data = new Float32Array(length);
    this.noiseChannels.push(data);
    return { getChannelData: () => data };
  }
}

describe("sonidos arcade", () => {
  it("define cada señal con voces cortas y niveles seguros", () => {
    expect(Object.keys(soundDefinitions).sort()).toEqual([...soundCues].sort());
    for (const cue of soundCues) {
      const definition = soundDefinitions[cue];
      expect(definition.voices.length, cue).toBeGreaterThan(0);
      for (const voice of definition.voices) {
        expect(voice.duration, cue).toBeGreaterThan(0);
        expect(voice.duration + (voice.delay ?? 0), cue).toBeLessThanOrEqual(
          0.6,
        );
        expect(voice.gain, cue).toBeGreaterThan(0);
        expect(voice.gain, cue).toBeLessThanOrEqual(0.2);
      }
    }
  });

  it("distingue ataques, impactos y bloqueo", () => {
    expect(attackCue("punch")).toBe("attack-punch");
    expect(attackCue("kick")).toBe("attack-kick");
    expect(attackCue("special")).toBe("attack-special");
    expect(hitCue({ attackKind: "punch", blocked: false })).toBe("hit-light");
    expect(hitCue({ attackKind: "kick", blocked: false })).toBe("hit-medium");
    expect(hitCue({ attackKind: "special", blocked: false })).toBe("hit-heavy");
    expect(hitCue({ attackKind: "special", blocked: true })).toBe("block");
  });

  it("detecta una sola vez ataques y transiciones aéreas", () => {
    const before = state();
    const action = state("fight", fighter(true, 7, "kick"));
    expect(combatTransitionCues(before, action)).toEqual([
      "attack-kick",
      "jump",
    ]);
    expect(combatTransitionCues(action, action)).toEqual([]);
    expect(
      combatTransitionCues(action, state("fight", fighter(false, 7, "kick"))),
    ).toEqual(["land"]);
  });

  it("distingue final, victoria y comienzo del siguiente round", () => {
    expect(combatTransitionCues(state(), state("round"))).toEqual([
      "round-end",
    ]);
    expect(combatTransitionCues(state(), state("over"))).toEqual(["victory"]);
    expect(
      combatTransitionCues(
        state("round", fighter(true)),
        state("fight", fighter(false)),
      ),
    ).toEqual(["round-start"]);
  });

  it("crea y reanuda AudioContext de forma diferida", () => {
    const context = new FakeAudioContext();
    const factory = vi.fn(() => context as unknown as AudioContext);
    const sounds = new SoundEffects(false, factory);
    expect(factory).not.toHaveBeenCalled();
    expect(sounds.play("hit-heavy")).toBe(true);
    expect(factory).toHaveBeenCalledOnce();
    expect(context.resume).toHaveBeenCalledOnce();
    expect(context.oscillators.length).toBeGreaterThan(0);
    expect(context.sources.length).toBeGreaterThan(0);
  });

  it("no inicializa audio silenciado y tolera un navegador sin Web Audio", () => {
    const factory = vi.fn(() => undefined);
    const sounds = new SoundEffects(true, factory);
    expect(sounds.muted).toBe(true);
    expect(sounds.play("ui-confirm")).toBe(false);
    expect(factory).not.toHaveBeenCalled();
    sounds.setMuted(false);
    expect(sounds.muted).toBe(false);
    expect(sounds.play("ui-confirm")).toBe(false);
    expect(factory).toHaveBeenCalledOnce();
  });

  it("genera el mismo ruido procedural para cada contexto", () => {
    const first = new FakeAudioContext();
    const second = new FakeAudioContext();
    new SoundEffects(false, () => first as unknown as AudioContext).play(
      "land",
    );
    new SoundEffects(false, () => second as unknown as AudioContext).play(
      "land",
    );
    expect(Array.from(first.noiseChannels[0].slice(0, 32))).toEqual(
      Array.from(second.noiseChannels[0].slice(0, 32)),
    );
  });
});
