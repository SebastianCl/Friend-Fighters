import { idle, type Action, type InputFrame } from "./combat";
export const actions: Action[] = [
  "left",
  "right",
  "up",
  "down",
  "punch",
  "kick",
  "special",
  "grab",
  "block",
];
export const labels: Record<Action, string> = {
  left: "Izquierda",
  right: "Derecha",
  up: "Saltar",
  down: "Agacharse",
  punch: "Puño",
  kick: "Patada",
  special: "Especial",
  grab: "Agarre",
  block: "Bloqueo",
};
export type Bindings = Record<Action, string>;
export type MenuInputFrame = Pick<
  InputFrame,
  "left" | "right" | "up" | "down"
> & {
  confirm: boolean;
  cancel: boolean;
};
const defaults: Bindings[] = [
  {
    left: "KeyA",
    right: "KeyD",
    up: "KeyW",
    down: "KeyS",
    punch: "KeyF",
    kick: "KeyG",
    special: "KeyH",
    grab: "KeyC",
    block: "KeyE",
  },
  {
    left: "ArrowLeft",
    right: "ArrowRight",
    up: "ArrowUp",
    down: "ArrowDown",
    punch: "KeyJ",
    kick: "KeyK",
    special: "KeyL",
    grab: "KeyM",
    block: "KeyI",
  },
];
const legacyActions = actions.filter(
  (action) => action !== "block" && action !== "grab",
);
const fallbackBlockKeys = ["KeyQ", "KeyU", "KeyO", "KeyP"];
const fallbackGrabKeys = ["KeyC", "KeyM", "KeyV", "KeyN", "KeyB", "KeyT"];

export function migrateBindings(stored: unknown): Bindings[] | null {
  if (
    !Array.isArray(stored) ||
    stored.length !== 2 ||
    !stored.every(
      (binding) =>
        binding &&
        typeof binding === "object" &&
        legacyActions.every(
          (action) =>
            typeof (binding as Partial<Bindings>)[action] === "string",
        ),
    )
  )
    return null;

  const migrated = stored.map((binding) => ({ ...binding })) as Bindings[];
  const used = new Set(
    migrated.flatMap((binding) =>
      Object.values(binding).filter(
        (value): value is string => typeof value === "string",
      ),
    ),
  );
  for (let player = 0; player < migrated.length; player++) {
    if (typeof migrated[player].block === "string") continue;
    const preferred = defaults[player].block;
    const block = [preferred, ...fallbackBlockKeys].find(
      (key) => !used.has(key),
    );
    if (!block) return null;
    migrated[player].block = block;
    used.add(block);
  }
  for (let player = 0; player < migrated.length; player++) {
    if (typeof migrated[player].grab === "string") continue;
    const grab = [defaults[player].grab, ...fallbackGrabKeys].find(
      (key) => !used.has(key),
    );
    if (!grab) return null;
    migrated[player].grab = grab;
    used.add(grab);
  }
  return migrated;
}

function gamepadFrame(pad: Gamepad | null | undefined): InputFrame {
  const input = idle();
  if (!pad) return input;
  input.left = !!pad.buttons[14]?.pressed || pad.axes[0] < -0.35;
  input.right = !!pad.buttons[15]?.pressed || pad.axes[0] > 0.35;
  input.up = !!pad.buttons[12]?.pressed || pad.axes[1] < -0.55;
  input.down = !!pad.buttons[13]?.pressed || pad.axes[1] > 0.55;
  input.punch = !!pad.buttons[0]?.pressed;
  input.kick = !!pad.buttons[1]?.pressed;
  input.special = !!pad.buttons[2]?.pressed;
  input.block = !!pad.buttons[3]?.pressed;
  input.grab = !!pad.buttons[5]?.pressed;
  return input;
}

function mergeFrames(target: InputFrame, source: InputFrame) {
  for (const action of actions) target[action] ||= source[action];
}

export class Inputs {
  keys = new Set<string>();
  pressed = new Set<string>();
  bindings = defaults.map((b) => ({ ...b }));
  devices = ["keyboard", "keyboard"];
  suspended = true;
  constructor() {
    try {
      const stored = JSON.parse(localStorage.getItem("ff-bindings") || "null");
      const migrated = migrateBindings(stored);
      if (migrated) {
        this.bindings = migrated;
        if (
          stored.some(
            (binding: Partial<Bindings>) => !binding.block || !binding.grab,
          )
        )
          this.save();
      }
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
        input[a] =
          this.keys.has(code) || (a !== "block" && this.pressed.has(code));
        this.pressed.delete(code);
      }
      return input;
    }
    return gamepadFrame(navigator.getGamepads?.()[Number(this.devices[i])]);
  }
  menuFrame(): MenuInputFrame {
    const input = idle();
    for (const pad of navigator.getGamepads?.() ?? []) {
      mergeFrames(input, gamepadFrame(pad));
    }
    return {
      left: input.left,
      right: input.right,
      up: input.up,
      down: input.down,
      // Menu actions intentionally use the existing combat mapping. On a
      // Switch Pro's standard browser mapping, button 0 is physical B and
      // button 3 is physical X.
      confirm: input.punch,
      cancel: input.block,
    };
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
