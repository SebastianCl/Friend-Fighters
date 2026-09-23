import type { MenuInputFrame } from "./input";

type Direction = "left" | "right" | "up" | "down";
type MenuElement = HTMLButtonElement | HTMLSelectElement;

const selector = "button:not(:disabled), select:not(:disabled)";

const emptyFrame = (): MenuInputFrame => ({
  left: false,
  right: false,
  up: false,
  down: false,
  confirm: false,
  cancel: false,
});

export class MenuNavigation {
  private root: ParentNode | null = null;
  private selected: MenuElement | null = null;
  private cancel: (() => void) | null = null;
  private previous = emptyFrame();

  constructor(private readonly readInput: () => MenuInputFrame) {
    window.addEventListener("keydown", (event) => this.handleKey(event));
    document.addEventListener("focusin", (event) => {
      const target = event.target;
      if (
        target instanceof HTMLButtonElement ||
        target instanceof HTMLSelectElement
      )
        this.select(target);
    });
    document.addEventListener(
      "pointerdown",
      (event) => {
        if (!(event.target instanceof Element)) return;
        const target = event.target.closest<MenuElement>(selector);
        if (target && this.root?.contains(target)) this.select(target);
      },
      true,
    );
  }

  setRoot(root: ParentNode | null, cancel: (() => void) | null = null) {
    this.selected?.classList.remove("menu-selected");
    this.root = root;
    this.cancel = cancel;
    // A render can happen inside the click handler that confirmed the previous
    // screen. Snapshotting held controls prevents that press leaking forward.
    this.previous = this.readInput();
    this.selected = this.elements()[0] ?? null;
    this.selected?.classList.add("menu-selected");
  }

  update() {
    if (!this.root) return;
    const current = this.readInput();
    for (const direction of ["left", "right", "up", "down"] as const) {
      if (current[direction] && !this.previous[direction]) this.move(direction);
    }
    if (current.confirm && !this.previous.confirm) this.activate();
    if (current.cancel && !this.previous.cancel) this.cancel?.();
    this.previous = current;
  }

  private handleKey(event: KeyboardEvent) {
    if (!this.root || event.repeat) return;
    const direction = event.key.replace("Arrow", "").toLowerCase();
    if (["left", "right", "up", "down"].includes(direction)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      this.move(direction as Direction);
      return;
    }
    if (event.code === "Enter" || event.code === "Space") {
      event.preventDefault();
      event.stopImmediatePropagation();
      this.activate();
      return;
    }
    if (event.code === "Escape" && this.cancel) {
      event.preventDefault();
      event.stopImmediatePropagation();
      this.cancel();
    }
  }

  private elements(): MenuElement[] {
    if (!this.root) return [];
    return Array.from(this.root.querySelectorAll<MenuElement>(selector)).filter(
      (element) => element.getClientRects().length > 0,
    );
  }

  private select(element: MenuElement) {
    if (!this.root?.contains(element) || element.disabled) return;
    this.selected?.classList.remove("menu-selected");
    this.selected = element;
    this.selected.classList.add("menu-selected");
  }

  private move(direction: Direction) {
    const elements = this.elements();
    if (!elements.length) return;
    if (!this.selected || !elements.includes(this.selected)) {
      this.select(elements[0]);
      return;
    }
    const current = this.selected.getBoundingClientRect();
    const currentX = current.left + current.width / 2;
    const currentY = current.top + current.height / 2;
    const candidates = elements
      .filter((element) => element !== this.selected)
      .map((element) => {
        const rect = element.getBoundingClientRect();
        const x = rect.left + rect.width / 2 - currentX;
        const y = rect.top + rect.height / 2 - currentY;
        const primary =
          direction === "left"
            ? -x
            : direction === "right"
              ? x
              : direction === "up"
                ? -y
                : y;
        const cross = direction === "left" || direction === "right" ? y : x;
        return { element, primary, cross };
      })
      .filter(({ primary }) => primary > 1)
      .sort(
        (a, b) =>
          a.primary +
          Math.abs(a.cross) * 2 -
          (b.primary + Math.abs(b.cross) * 2),
      );
    if (candidates[0]) this.select(candidates[0].element);
  }

  private activate() {
    const element = this.selected;
    if (!element || element.disabled) return;
    if (element instanceof HTMLSelectElement) {
      const options = Array.from(element.options).filter(
        (option) => !option.disabled,
      );
      const current = options.indexOf(element.selectedOptions[0]);
      const next = options[(current + 1) % options.length];
      if (!next) return;
      element.value = next.value;
      element.dispatchEvent(new Event("change", { bubbles: true }));
      return;
    }
    element.click();
  }
}
