import Phaser from "phaser";
import {
  animationFor,
  animationRegions,
  attackPhase,
  type AnimationKey,
  type AnimationRegion,
} from "./animation";
import { type Combat, type Hit } from "./combat";
import { visualFighter, visualStage } from "./visual-assets";

interface FrameArt extends AnimationRegion {
  footY: number;
  bounds: { left: number; top: number; right: number; bottom: number };
}
export interface ArenaState {
  combat: Combat;
  screen: "menu" | "select" | "fight" | "result";
  paused: boolean;
}
interface ArenaHooks {
  state: () => ArenaState;
  advance: (delta: number) => void;
  ready: () => void;
  error: () => void;
}
export const presentation = {
  width: 1280,
  height: 720,
  groundY: 612,
  unit: 2,
  fighterHeight: 420,
};

export function makeArena(hooks: ArenaHooks) {
  return class NeonArena extends Phaser.Scene {
    art = new Map<AnimationKey, FrameArt>();
    sprites: Phaser.GameObjects.Image[] = [];
    shadows: Phaser.GameObjects.Ellipse[] = [];
    rings: Phaser.GameObjects.Ellipse[] = [];
    markers: Phaser.GameObjects.Text[] = [];
    energy!: Phaser.GameObjects.Graphics;
    clock = 0;
    lastPose = ["", ""];
    poseSince = [0, 0];
    loadFailed = false;
    preload() {
      this.load.image("guard", visualFighter.sprite);
      this.load.image("motion", "/art/combat-v2/movement-sheet.png");
      this.load.image("air", "/art/combat-v2/air-sheet-v2.png");
      this.load.image("neon", visualStage.background);
      this.load.image("portrait", visualFighter.portrait);
      this.load.on("loaderror", () => {
        this.loadFailed = true;
        hooks.error();
      });
    }
    create() {
      if (this.loadFailed) return;
      try {
        const pixels = new Map<
          string,
          { data: Uint8ClampedArray; width: number }
        >();
        for (const sheet of ["guard", "motion", "air"]) {
          const img = this.textures
            .get(sheet)
            .getSourceImage() as HTMLImageElement;
          const c = document.createElement("canvas");
          c.width = img.width;
          c.height = img.height;
          const ctx = c.getContext("2d", { willReadFrequently: true })!;
          ctx.drawImage(img, 0, 0);
          pixels.set(sheet, {
            data: ctx.getImageData(0, 0, c.width, c.height).data,
            width: c.width,
          });
        }
        for (const region of animationRegions) {
          const source = pixels.get(region.sheet)!;
          let left = region.width,
            top = region.height,
            right = 0,
            bottom = 0;
          for (let y = 0; y < region.height; y++)
            for (let x = 0; x < region.width; x++) {
              if (
                source.data[
                  ((region.y + y) * source.width + region.x + x) * 4 + 3
                ] > 128
              ) {
                left = Math.min(left, x);
                top = Math.min(top, y);
                right = Math.max(right, x + 1);
                bottom = Math.max(bottom, y + 1);
              }
            }
          if (bottom === 0) throw new Error(`Empty animation ${region.key}`);
          this.textures
            .get(region.sheet)
            .add(
              region.key,
              0,
              region.x,
              region.y,
              region.width,
              region.height,
            );
          this.art.set(region.key, {
            ...region,
            footY: bottom,
            bounds: { left, top, right, bottom },
          });
        }
        // Background is a fixed CSS layer: the combat camera can pull back during jumps.
        const shade = this.add.graphics();
        shade.fillStyle(0x09041f, 0.16);
        shade.fillRect(-400, -400, 2080, 1520);
        [0, 1].forEach((i) => {
          this.rings.push(
            this.add.ellipse(
              0,
              612,
              230,
              22,
              i === 0 ? 0x55deff : 0xff60d5,
              0.2,
            ),
          );
          this.shadows.push(this.add.ellipse(0, 612, 190, 18, 0x08021a, 0.56));
          this.sprites.push(this.add.image(0, 0, "guard", "guard").setDepth(2));
          this.markers.push(
            this.add
              .text(0, 632, `P${i + 1}`, {
                fontFamily: "monospace",
                fontSize: "12px",
                fontStyle: "bold",
                color: i === 0 ? "#78edff" : "#ff85e1",
                stroke: "#0c0425",
                strokeThickness: 3,
              })
              .setOrigin(0.5)
              .setDepth(5),
          );
        });
        this.energy = this.add.graphics().setDepth(4);
        this.cameras.main.setZoom(1).centerOn(640, 360);
        this.game.canvas.setAttribute(
          "aria-label",
          "Arena de combate en Distrito Neón",
        );
        this.game.canvas.dataset.cameraZoom = "1.000";
        this.game.canvas.dataset.ready = "true";
        hooks.ready();
      } catch (error) {
        console.error(error);
        this.loadFailed = true;
        hooks.error();
      }
    }
    impact(hit: Hit) {
      if (!this.energy) return;
      const x = hit.x * 2,
        y = presentation.groundY - hit.y * 2;
      const color = hit.blocked ? 0x76eaff : hit.special ? 0xff70e3 : 0xfff396;
      const flash = this.add
        .star(x, y, 7, 8, hit.special ? 46 : 28, color, 1)
        .setDepth(6);
      const ring = this.add
        .circle(x, y, hit.special ? 30 : 18)
        .setStrokeStyle(3, color)
        .setDepth(6);
      this.tweens.add({
        targets: [flash, ring],
        scale: 1.8,
        alpha: 0,
        duration: 160,
        onComplete: () => {
          flash.destroy();
          ring.destroy();
        },
      });
      if (!hit.blocked)
        this.cameras.main.shake(
          hit.special ? 100 : 45,
          hit.special ? 0.003 : 0.001,
        );
    }
    update(_time: number, delta: number) {
      if (this.loadFailed || !this.energy) return;
      hooks.advance(Math.min(delta, 100));
      const state = hooks.state();
      if (!state.paused) this.clock += Math.min(delta, 100) * 0.06;
      this.tweens.timeScale = state.paused ? 0 : 1;
      this.energy.clear();
      state.combat.fighters.forEach((original, i) => {
        const f =
          state.screen === "menu" || state.screen === "select"
            ? {
                ...original,
                pose: "idle" as const,
                attack: null,
                x: i === 0 ? 180 : 460,
                y: 0,
                hp: 100,
              }
            : original;
        const pose = f.hp === 0 ? "fall" : f.pose;
        if (pose !== this.lastPose[i]) {
          this.lastPose[i] = pose;
          this.poseSince[i] = this.clock;
        }
        const key =
          state.combat.phase !== "fight" && f.hp > 0
            ? "guard"
            : animationFor(f, this.clock, this.clock - this.poseSince[i]);
        const art = this.art.get(key)!;
        const scale = presentation.fighterHeight / art.referenceHeight;
        let x = f.x * presentation.unit;
        const airborneOffset =
          f.hp === 0
            ? Math.max(
                0,
                f.y * presentation.unit -
                  0.6 * (this.clock - this.poseSince[i]) ** 2,
              )
            : f.y * presentation.unit;
        const y = presentation.groundY - airborneOffset;
        if (key === "fall") {
          const offsets = [
            (art.bounds.left - art.anchorX) * scale * f.facing,
            (art.bounds.right - art.anchorX) * scale * f.facing,
          ];
          x = Phaser.Math.Clamp(
            x,
            12 - Math.min(...offsets),
            1268 - Math.max(...offsets),
          );
        }
        const image = this.sprites[i];
        image
          .setTexture(art.sheet, key)
          .setOrigin(art.anchorX / art.width, art.footY / art.height)
          .setScale(scale * f.facing, scale)
          .setPosition(Math.round(x), Math.round(y));
        this.shadows[i]
          .setPosition(x, 614)
          .setScale(Math.max(0.5, 1 - f.y / 250));
        this.rings[i].setPosition(x, 614);
        this.markers[i].setPosition(x, 637);
        const show = state.screen !== "menu" || i === 1;
        [image, this.shadows[i], this.rings[i], this.markers[i]].forEach((o) =>
          o.setVisible(show),
        );
        this.game.canvas.dataset[`p${i + 1}Stance`] = f.stance;
        this.game.canvas.dataset[`p${i + 1}HitStun`] = String(f.hitStun);
        this.game.canvas.dataset[`p${i + 1}AttackPhase`] =
          attackPhase(f) ?? "none";
        this.game.canvas.dataset[`p${i + 1}GuardStun`] = String(f.guardStun);
        this.game.canvas.dataset[`p${i + 1}Y`] = String(f.y);
        this.game.canvas.dataset[`p${i + 1}Animation`] = key;
        this.game.canvas.dataset[`p${i + 1}X`] = String(Math.round(x));
        this.game.canvas.dataset[`p${i + 1}RenderedHeight`] = (
          art.referenceHeight *
          Math.abs(image.scaleY) *
          this.cameras.main.zoom
        ).toFixed(3);
        if (f.attack?.kind === "special" && show) {
          const phase = attackPhase(f),
            radius =
              phase === "startup"
                ? 10 + f.attack.frame
                : phase === "active"
                  ? 52
                  : 0;
          if (radius) {
            const ex = x + f.facing * (phase === "startup" ? 65 : 185),
              ey = y - (f.attack.crouched ? 180 : 300);
            this.energy.fillStyle(i === 0 ? 0x57e7ff : 0xff55d8, 0.28);
            this.energy.fillCircle(ex, ey, radius);
            this.energy.lineStyle(3, i === 0 ? 0x96ffff : 0xffbcf4, 0.95);
            this.energy.strokeCircle(ex, ey, radius * 0.7);
            this.energy.fillStyle(0xfff9d0, 0.8);
            this.energy.fillCircle(ex, ey, radius * 0.24);
          }
        }
      });
    }
  };
}
