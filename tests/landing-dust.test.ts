import { describe, expect, it, vi } from "vitest";
import {
  landedThisStep,
  landingDustDuration,
} from "../src/effects/landing-dust";
import { VisualEffectsManager } from "../src/effects/visual-effects-manager";

describe("landing dust trigger", () => {
  it("detects only an airborne-to-ground transition", () => {
    expect(landedThisStep(true, 0)).toBe(true);
    expect(landedThisStep(false, 0)).toBe(false);
    expect(landedThisStep(true, 12)).toBe(false);
  });

  it("keeps the animation lifetime aligned with all 16 frames", () => {
    expect(landingDustDuration(30)).toBeCloseTo((16 * 1000) / 30);
  });

  it("applies configured sprite placement and deactivates it on expiry", () => {
    const manager = new VisualEffectsManager();
    manager.init({} as Phaser.Scene);
    const sprite = {
      stop: vi.fn(),
      setPosition: vi.fn().mockReturnThis(),
      setDepth: vi.fn().mockReturnThis(),
      setScale: vi.fn().mockReturnThis(),
      setActive: vi.fn().mockReturnThis(),
      setVisible: vi.fn().mockReturnThis(),
    } as unknown as Phaser.GameObjects.Sprite;
    manager.registerType("dust-test", {
      ttl: 10,
      scale: 0.2,
      depth: 1,
      offsetX: 3,
      offsetY: -2,
      create: (effect) => {
        effect.sprite = sprite;
      },
    });

    manager.spawn("dust-test", { x: 5, y: 8 });
    expect(sprite.setPosition).toHaveBeenCalledWith(8, 6);
    expect(sprite.setDepth).toHaveBeenCalledWith(1);
    expect(sprite.setScale).toHaveBeenCalledWith(0.2);

    manager.update(10);
    expect(sprite.stop).toHaveBeenCalledOnce();
    expect(sprite.setActive).toHaveBeenCalledWith(false);
    expect(sprite.setVisible).toHaveBeenCalledWith(false);
  });
});
