import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  MusicPlayer,
  musicNotesAtStep,
  musicStepDuration,
  musicTracks,
} from "../src/music";

class FakeParam {
  value = 0;
  targets: number[] = [];
  setValueAtTime(value: number) {
    this.value = value;
    this.targets.push(value);
  }
  linearRampToValueAtTime(value: number) {
    this.value = value;
    this.targets.push(value);
  }
  exponentialRampToValueAtTime(value: number) {
    this.value = value;
    this.targets.push(value);
  }
  cancelScheduledValues() {}
}

class FakeNode {
  connect = vi.fn();
  disconnect = vi.fn();
}

class FakeGain extends FakeNode {
  gain = new FakeParam();
}

class FakeSource extends FakeNode {
  onended: (() => void) | null = null;
  type: OscillatorType = "sine";
  frequency = new FakeParam();
  buffer: AudioBuffer | null = null;
  start = vi.fn();
  stop = vi.fn();
}

class FakeFilter extends FakeNode {
  type: BiquadFilterType = "lowpass";
  frequency = new FakeParam();
}

class FakeContext {
  currentTime = 1;
  sampleRate = 8_000;
  state: AudioContextState = "running";
  destination = new FakeNode();
  resume = vi.fn().mockResolvedValue(undefined);
  gains: FakeGain[] = [];
  sources: FakeSource[] = [];

  createGain() {
    const gain = new FakeGain();
    this.gains.push(gain);
    return gain;
  }
  createOscillator() {
    const source = new FakeSource();
    this.sources.push(source);
    return source;
  }
  createBufferSource() {
    const source = new FakeSource();
    this.sources.push(source);
    return source;
  }
  createBiquadFilter() {
    return new FakeFilter();
  }
  createBuffer(_channels: number, length: number) {
    const samples = new Float32Array(length);
    return { getChannelData: () => samples };
  }
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("música chiptune", () => {
  it("compone dos loops distintos y un cierre finito por pasos", () => {
    for (const theme of ["menu", "fight", "result"] as const) {
      expect(musicTracks[theme].lead).toHaveLength(
        musicTracks[theme].bass.length,
      );
      expect(musicTracks[theme].lead.length % 16).toBe(0);
      expect(musicStepDuration(theme)).toBeGreaterThan(0);
    }
    expect(musicNotesAtStep("menu", 0)).not.toEqual(
      musicNotesAtStep("fight", 0),
    );
    expect(musicNotesAtStep("menu", 64)).toEqual(musicNotesAtStep("menu", 0));
    expect(musicNotesAtStep("result", 16)).toEqual([]);
  });

  it("espera interacción y no falla cuando Web Audio no existe", () => {
    const unavailable = vi.fn(() => undefined);
    const player = new MusicPlayer(false, unavailable);
    player.setTheme("fight");
    expect(unavailable).not.toHaveBeenCalled();
    expect(player.theme).toBe("fight");
    expect(() => player.unlock()).not.toThrow();
    expect(unavailable).toHaveBeenCalledOnce();
  });

  it("programa notas solo mientras suena y conserva la posición al silenciar", () => {
    const context = new FakeContext();
    const player = new MusicPlayer(
      false,
      () => context as unknown as AudioContext,
    );
    player.unlock();
    const initial = context.sources.length;
    expect(initial).toBeGreaterThan(0);
    context.currentTime += 0.4;
    vi.advanceTimersByTime(50);
    expect(context.sources.length).toBeGreaterThan(initial);
    player.setMuted(true);
    const position = player.position;
    const stopped = context.sources.length;
    context.currentTime += 1;
    vi.advanceTimersByTime(1_000);
    expect(context.sources).toHaveLength(stopped);
    expect(player.position).toBe(position);
    player.setMuted(false);
    expect(player.position).toBe(position);
    context.currentTime += 0.4;
    vi.advanceTimersByTime(50);
    expect(context.sources.length).toBeGreaterThan(stopped);
    expect(player.position).toBeGreaterThan(position);
  });

  it("cambia de tema y atenúa la música durante la pausa", () => {
    const context = new FakeContext();
    const player = new MusicPlayer(
      false,
      () => context as unknown as AudioContext,
    );
    player.unlock();
    const oldSources = [...context.sources];
    player.setTheme("fight");
    expect(player.theme).toBe("fight");
    expect(
      oldSources.every((source) => source.stop.mock.calls.length >= 2),
    ).toBe(true);
    const trackGain = context.gains.findLast((gain) =>
      gain.gain.targets.includes(1),
    );
    player.setPaused(true);
    expect(trackGain?.gain.targets.at(-1)).toBe(0.22);
    player.setPaused(false);
    expect(trackGain?.gain.targets.at(-1)).toBe(1);
  });

  it("termina el cierre una sola vez", () => {
    const context = new FakeContext();
    const player = new MusicPlayer(
      false,
      () => context as unknown as AudioContext,
    );
    player.setTheme("result");
    player.unlock();
    context.currentTime += 3;
    vi.advanceTimersByTime(50);
    const endedAt = context.sources.length;
    vi.advanceTimersByTime(1_000);
    expect(context.sources).toHaveLength(endedAt);
    player.setMuted(true);
    player.setMuted(false);
    expect(context.sources).toHaveLength(endedAt);
  });
});
