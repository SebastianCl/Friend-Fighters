import { idle, type Action, type InputFrame } from "./combat";
export const actions: Action[] = [
  "left",
  "right",
  "up",
  "down",
  "punch",
  "kick",
  "special",
];
export const labels: Record<Action, string> = {
  left: "Izquierda",
  right: "Derecha",
  up: "Saltar",
  down: "Agacharse",
  punch: "Puño",
  kick: "Patada",
  special: "Especial",
};
export type Bindings = Record<Action, string>;
const defaults: Bindings[] = [
  {
    left: "KeyA",
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
export class Inputs {
  keys = new Set<string>();
  pressed = new Set<string>();
  bindings = defaults.map((b) => ({ ...b }));
  devices = ["keyboard", "keyboard"];
  suspended = true;
  constructor() {
    try {
      const stored = JSON.parse(localStorage.getItem("ff-bindings") || "null");
      if (
        Array.isArray(stored) &&
        stored.length === 2 &&
        stored.every((b) => actions.every((a) => typeof b[a] === "string"))
      )
        this.bindings = stored;
    } catch {}
    window.addEventListener("keydown", (e) => {
      if (
        !this.suspended &&
        this.bindings.some((b) => Object.values(b).includes(e.code))
      ) {
        e.preventDefault();
        if (!this.keys.has(e.code)) this.pressed.add(e.code);
        this.keys.add(e.code);
      }
    });
    window.addEventListener("keyup", (e) => this.keys.delete(e.code));
  }
  clear() {
    this.keys.clear();
    this.pressed.clear();
  }
  save() {
    try {
      localStorage.setItem("ff-bindings", JSON.stringify(this.bindings));
    } catch {}
  }
  frame(i: number): InputFrame {
    const input = idle();
    if (this.suspended) return input;
    if (this.devices[i] === "keyboard") {
      for (const a of actions) {
        const code = this.bindings[i][a];
        input[a] = this.keys.has(code) || this.pressed.has(code);
        this.pressed.delete(code);
      }
      return input;
    }
    const pad = navigator.getGamepads?.()[Number(this.devices[i])];
    if (!pad) return input;
    input.left = !!pad.buttons[14]?.pressed || pad.axes[0] < -0.35;
    input.right = !!pad.buttons[15]?.pressed || pad.axes[0] > 0.35;
    input.up = !!pad.buttons[12]?.pressed || pad.axes[1] < -0.55;
    input.down = !!pad.buttons[13]?.pressed || pad.axes[1] > 0.55;
    input.punch = !!pad.buttons[0]?.pressed;
    input.kick = !!pad.buttons[1]?.pressed;
    input.special = !!pad.buttons[2]?.pressed;
    return input;
  }
}
export const keyLabel = (code: string) =>
  code
    .replace("Key", "")
    .replace("ArrowLeft", "←")
    .replace("ArrowRight", "→")
    .replace("ArrowUp", "↑")
    .replace("ArrowDown", "↓")
    .replace("Digit", "");
