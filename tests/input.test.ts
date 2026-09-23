import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import { Inputs, migrateBindings } from "../src/input";
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
  it("mantiene el bloqueo dedicado y no convierte un toque breve en guardia", () => {
    const input = new Inputs();
    input.suspended = false;
    key("keydown", "KeyE");
    expect(input.frame(0).block).toBe(true);
    expect(input.frame(0).block).toBe(true);
    key("keyup", "KeyE");
    expect(input.frame(0).block).toBe(false);
    key("keydown", "KeyI");
    key("keyup", "KeyI");
    expect(input.frame(1).block).toBe(false);
  });
  it("lee dos mandos independientes con zona muerta", () => {
    vi.stubGlobal("navigator", {
      getGamepads: () => [pad([0.1, -0.8], [0, 3]), pad([-0.7, 0], [2, 3])],
    });
    const input = new Inputs();
    input.devices = ["0", "1"];
    input.suspended = false;
    expect(input.frame(0)).toMatchObject({
      right: false,
      up: true,
      punch: true,
      special: false,
      block: true,
    });
    expect(input.frame(1)).toMatchObject({
      left: true,
      special: true,
      punch: false,
      block: true,
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
  it("lee el botón superior derecho del mando para agarrar", () => {
    vi.stubGlobal("navigator", { getGamepads: () => [pad([0, 0], [5])] });
    const input = new Inputs();
    input.devices = ["0", "keyboard"];
    input.suspended = false;
    expect(input.frame(0).grab).toBe(true);
  });
  it("migra el agarre sin reemplazar asignaciones personalizadas", () => {
    const stored = [
      {
        left: "KeyA",
        right: "KeyD",
        up: "KeyW",
        down: "KeyS",
        punch: "KeyF",
        kick: "KeyG",
        special: "KeyH",
        block: "KeyC",
      },
      {
        left: "ArrowLeft",
        right: "ArrowRight",
        up: "ArrowUp",
        down: "ArrowDown",
        punch: "KeyJ",
        kick: "KeyK",
        special: "KeyL",
        block: "KeyI",
      },
    ];
    expect(migrateBindings(stored)).toMatchObject([
      { block: "KeyC", grab: "KeyM" },
      { block: "KeyI", grab: "KeyV" },
    ]);
  });
  it("migra bindings antiguos conservando teclas personalizadas", () => {
    const old = [
      {
        left: "KeyZ",
        right: "KeyD",
        up: "KeyW",
        down: "KeyS",
        punch: "KeyF",
        kick: "KeyG",
        special: "KeyH",
      },
      {
        left: "ArrowLeft",
        right: "ArrowRight",
        up: "ArrowUp",
        down: "ArrowDown",
        punch: "KeyJ",
        kick: "KeyK",
        special: "KeyL",
      },
    ];
    expect(migrateBindings(old)).toMatchObject([
      { left: "KeyZ", block: "KeyE" },
      { left: "ArrowLeft", block: "KeyI" },
    ]);
  });
  it("elige fallbacks libres cuando E o I ya estaban personalizados", () => {
    const old = [
      {
        left: "KeyA",
        right: "KeyD",
        up: "KeyW",
        down: "KeyS",
        punch: "KeyE",
        kick: "KeyG",
        special: "KeyH",
      },
      {
        left: "ArrowLeft",
        right: "ArrowRight",
        up: "ArrowUp",
        down: "ArrowDown",
        punch: "KeyI",
        kick: "KeyK",
        special: "KeyL",
      },
    ];
    expect(migrateBindings(old)?.map((binding) => binding.block)).toEqual([
      "KeyQ",
      "KeyU",
    ]);
  });
});
