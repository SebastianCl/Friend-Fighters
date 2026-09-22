export class VisualEffect {
  type!: string;
  position!: { x: number; y: number };
  graphics?: Phaser.GameObjects.Graphics;
  sprite?: Phaser.GameObjects.Sprite;
  ttl: number;
  elapsed: number = 0;

  constructor(ttl: number = 200) {
    this.ttl = ttl;
  }

  get isDone(): boolean {
    return this.elapsed >= this.ttl;
  }

  create(): void {
    // abstract — overridden by subclasses / type configs
  }

  update(delta: number): void {
    this.elapsed += delta;
  }

  destroy(): void {
    if (this.graphics) {
      this.graphics.destroy();
      this.graphics = undefined;
    }
    this.sprite?.stop();
    this.sprite?.setActive(false).setVisible(false);
  }
}

export type EffectConfig = {
  ttl?: number;
  scale?: number;
  depth?: number;
  offsetX?: number;
  offsetY?: number;
  create: (effect: VisualEffect, scene: Phaser.Scene) => void;
  update?: (effect: VisualEffect, delta: number) => void;
};
