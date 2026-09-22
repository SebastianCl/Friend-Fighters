import { VisualEffect, EffectConfig } from "./visual-effect";
import Phaser from "phaser";

export class VisualEffectsManager {
  private static _instance: VisualEffectsManager | null = null;
  private _pool: VisualEffect[] = [];
  private _active: VisualEffect[] = [];
  private _scene!: Phaser.Scene;
  private _poolSize = 16;
  private _typeConfigs: Map<string, EffectConfig> = new Map();

  get scene(): Phaser.Scene {
    return this._scene;
  }

  static get instance(): VisualEffectsManager {
    if (!VisualEffectsManager._instance) {
      VisualEffectsManager._instance = new VisualEffectsManager();
    }
    return VisualEffectsManager._instance;
  }

  init(scene: Phaser.Scene): void {
    this._scene = scene;
    for (let i = 0; i < this._poolSize; i++) {
      const effect = new VisualEffect(200);
      this._pool.push(effect);
    }
  }

  registerType(type: string, config: EffectConfig): void {
    this._typeConfigs.set(type, config);
  }

  spawn(type: string, position: { x: number; y: number }): VisualEffect | null {
    const config = this._typeConfigs.get(type);
    if (!config) {
      console.warn(`Visual effect type "${type}" not registered`);
      return null;
    }

    let effect: VisualEffect;
    if (this._pool.length > 0) {
      effect = this._pool.shift()!;
      effect.ttl = config.ttl ?? 200;
    } else {
      effect = new VisualEffect(config.ttl ?? 200);
    }

    effect.type = type;
    effect.position = position;
    effect.elapsed = 0;
    config.create(effect, this._scene);
    effect.graphics?.setPosition(position.x, position.y).setDepth(7);

    this._active.push(effect);
    return effect;
  }

  update(delta: number): void {
    for (let i = this._active.length - 1; i >= 0; i--) {
      const effect = this._active[i];
      effect.update(delta);
      this._typeConfigs.get(effect.type)?.update?.(effect, delta);

      if (effect.isDone) {
        effect.destroy();
        this._active.splice(i, 1);
        this._pool.push(effect);
      }
    }
  }
}

export const effects = VisualEffectsManager.instance;
