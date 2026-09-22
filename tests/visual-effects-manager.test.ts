import { describe, expect, it, vi } from "vitest";
import { VisualEffectsManager } from "../src/effects/visual-effects-manager";

describe("VisualEffectsManager", () => {
  it("coloca el efecto y ejecuta su actualización antes de destruirlo", () => {
    const manager = new VisualEffectsManager();
    manager.init({} as Phaser.Scene);

    const graphics = {
      setPosition: vi.fn().mockReturnThis(),
      setDepth: vi.fn().mockReturnThis(),
      destroy: vi.fn(),
    } as unknown as Phaser.GameObjects.Graphics;
    const update = vi.fn();
    manager.registerType("test", {
      ttl: 40,
      create: (effect) => {
        effect.graphics = graphics;
      },
      update,
    });

    const effect = manager.spawn("test", { x: 240, y: 315 });
    expect(effect).not.toBeNull();
    expect(graphics.setPosition).toHaveBeenCalledWith(240, 315);
    expect(graphics.setDepth).toHaveBeenCalledWith(7);

    manager.update(20);
    expect(effect?.elapsed).toBe(20);
    expect(update).toHaveBeenCalledWith(effect, 20);
    expect(graphics.destroy).not.toHaveBeenCalled();

    manager.update(20);
    expect(graphics.destroy).toHaveBeenCalledOnce();
  });
});
