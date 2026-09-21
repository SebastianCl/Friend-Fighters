import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import { Inputs } from "../src/input";
let events: EventTarget;
const key = (type: string, code: string) =>
  events.dispatchEvent(Object.assign(new Event(type), { code }));
const pad = (axes = [0, 0], pressed: number[] = []) => ({
  axes,
  buttons: Array.from({ length: 17 }, (_, i) => ({
    pressed: pressed.includes(i),
  })),
});
beforeEach(() => {
  events = new EventTarget();
  vi.stubGlobal("window", events);
  vi.stubGlobal("localStorage", { getItem: () => null, setItem: vi.fn() });
  vi.stubGlobal("navigator", { getGamepads: () => [] });
});
afterEach(() => vi.unstubAllGlobals());
describe("entradas independientes de render", () => {
  it("conserva una pulsación que comienza y termina entre dos pasos", () => {
    const input = new Inputs();
    input.suspended = false;
    key("keydown", "KeyF");
    key("keyup", "KeyF");
    expect(input.frame(0).punch).toBe(true);
    expect(input.frame(0).punch).toBe(false);
  });
  it("separa ambos jugadores en teclado y limpia pendientes", () => {
    const input = new Inputs();
    input.suspended = false;
    key("keydown", "KeyF");
    key("keydown", "KeyK");
    expect(input.frame(0).punch).toBe(true);
    expect(input.frame(1).kick).toBe(true);
    input.clear();
    expect(input.frame(0).punch).toBe(false);
    expect(input.frame(1).kick).toBe(false);
  });
  it("lee dos mandos independientes con zona muerta", () => {
    vi.stubGlobal("navigator", {
      getGamepads: () => [pad([0.1, -0.8], [0]), pad([-0.7, 0], [2])],
    });
    const input = new Inputs();
    input.devices = ["0", "1"];
    input.suspended = false;
    expect(input.frame(0)).toMatchObject({
      right: false,
      up: true,
      punch: true,
      special: false,
    });
    expect(input.frame(1)).toMatchObject({
      left: true,
      special: true,
      punch: false,
    });
  });
  it("combina teclado con mando y tolera desconexión", () => {
    vi.stubGlobal("navigator", { getGamepads: () => [pad([0.8, 0], [1])] });
    const input = new Inputs();
    input.devices = ["keyboard", "0"];
    input.suspended = false;
    key("keydown", "KeyA");
    expect(input.frame(0).left).toBe(true);
    expect(input.frame(1)).toMatchObject({ right: true, kick: true });
    vi.stubGlobal("navigator", { getGamepads: () => [null] });
    expect(input.frame(1).kick).toBe(false);
  });
  it("no recibe ataques mientras está pausado", () => {
    const input = new Inputs();
    key("keydown", "KeyF");
    input.suspended = false;
    expect(input.frame(0).punch).toBe(false);
  });
});
