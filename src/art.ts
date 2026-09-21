import Phaser from "phaser";
import { fighters, type FighterDefinition, type Pose } from "./combat";
const poses: Pose[] = [
  "idle",
  "walk",
  "jump",
  "crouch",
  "attack",
  "block",
  "hurt",
  "fall",
];
// Original pixel drawings, generated once as sprite textures; no external art dependencies.
export function drawFighter(
  ctx: CanvasRenderingContext2D,
  d: FighterDefinition,
  pose: Pose,
  frame = 0,
  kind = "punch",
) {
  const color = (n: number) => "#" + n.toString(16).padStart(6, "0");
  const r = (x: number, y: number, w: number, h: number, c: number) => {
    ctx.fillStyle = color(c);
    ctx.fillRect(x, y, w, h);
  };
  ctx.save();
  if (pose === "fall") {
    ctx.translate(0, 98);
    ctx.rotate(-Math.PI / 2);
  }
  const crouch = pose === "crouch" ? 15 : 0,
    bob = pose === "idle" ? (frame % 2) * 1 : 0;
  ctx.translate(0, crouch + bob);
  const dark = 0x172332,
    skin = d.skin,
    light = d.light;
  const stride = pose === "walk" ? (frame % 2 === 0 ? 6 : -6) : 0;
  const jump = pose === "jump";
  r(26, 47, 12, 25 - crouch, d.color);
  r(39, 47, 12, 23 - crouch, d.color);
  r(26 - stride, 66 - crouch - (jump ? 9 : 0), 13, 8, dark);
  r(39 + stride, 64 - crouch - (jump ? 5 : 0), 14, 9, dark);
  r(26, 49, 5, 13 - crouch, light);
  r(40, 49, 4, 13 - crouch, light);
  r(24, 25, 28, 26, dark);
  r(27, 27, 22, 21, d.color);
  r(29, 28, 7, 15, light);
  r(27, 45, 24, 5, 0xe8d7b0);
  r(40, 47, 5, 9, dark);
  r(32, 13, 15, 15, skin);
  r(30, 10, 18, 7, d.hair);
  r(29, 15, 5, 7, d.hair);
  r(43, 18, 3, 2, 0x101820);
  r(46, 23, 3, 3, skin);
  r(30, 12, 19, 3, d.color);
  r(24, 14, 7, 3, d.color);
  r(20, 29, 8, 15, skin);
  r(20, 40, 12, 7, dark);
  r(27, 37, 7, 7, light);
  if (pose === "attack") {
    if (kind === "kick") {
      r(44, 46, 22, 9, d.color);
      r(60, 42, 12, 10, dark);
    } else {
      r(46, 28, 18 + (frame % 2) * 3, 8, skin);
      r(62, 26, 10, 11, kind === "special" ? light : dark);
    }
  } else if (pose === "block") {
    r(46, 20, 7, 20, skin);
    r(45, 17, 10, 10, light);
  } else if (pose === "hurt") {
    r(47, 35, 13, 7, skin);
    r(56, 39, 7, 7, dark);
  } else {
    r(46, 29, 7, 13, skin);
    r(50, 25, 8, 9, dark);
    r(50, 25, 7, 3, light);
  }
  ctx.restore();
}
export function portrait(d: FighterDefinition): string {
  const canvas = document.createElement("canvas");
  canvas.width = 80;
  canvas.height = 80;
  drawFighter(canvas.getContext("2d")!, d, "idle");
  return canvas.toDataURL();
}
export function createTextures(scene: Phaser.Scene) {
  for (const d of fighters)
    for (const pose of poses)
      for (let frame = 0; frame < 2; frame++)
        for (const kind of pose === "attack"
          ? ["punch", "kick", "special"]
          : ["punch"]) {
          const key = `${d.id}-${d.animations[pose]}-${frame}-${kind}`;
          const texture = scene.textures.createCanvas(key, 80, 80)!;
          drawFighter(texture.context, d, pose, frame, kind);
          texture.refresh();
        }
  const t = scene.textures.createCanvas("arena", 640, 360)!;
  const c = t.context;
  const r = (x: number, y: number, w: number, h: number, color: string) => {
    c.fillStyle = color;
    c.fillRect(x, y, w, h);
  };
  r(0, 0, 640, 360, "#152332");
  r(0, 0, 640, 130, "#283646");
  r(0, 65, 640, 80, "#36434b");
  r(0, 110, 640, 54, "#55504c");
  r(466, 59, 43, 43, "#eec896");
  r(466, 78, 43, 2, "#d4af83");
  for (let i = 0; i < 18; i++) {
    const x = i * 39,
      h = 35 + ((i * 31) % 65);
    r(x, 164 - h, 32, h, "#22313d");
    for (let k = 0; k < 4; k++)
      if ((i + k) % 3 !== 0)
        r(
          x + 6 + (k % 2) * 13,
          170 - h + Math.floor(k / 2) * 18,
          4,
          7,
          "#7c7661",
        );
  }
  r(0, 165, 640, 105, "#192a33");
  r(12, 145, 163, 123, "#24363c");
  r(24, 154, 139, 103, "#314146");
  for (let i = 0; i < 8; i++) r(28, 165 + i * 10, 129, 2, "#23363d");
  r(20, 137, 148, 20, "#18242e");
  c.font = "bold 12px monospace";
  c.fillStyle = "#dfb98e";
  c.fillText("BARRIO  /  08", 32, 151);
  r(180, 190, 229, 78, "#344047");
  for (let y = 196; y < 265; y += 12)
    for (let x = 182; x < 405; x += 28)
      r(x + (y % 24 === 4 ? 12 : 0), y, 23, 1, "#455057");
  r(431, 139, 158, 130, "#1b2d35");
  r(445, 159, 125, 88, "#11232c");
  r(448, 162, 119, 3, "#486163");
  for (let x = 455; x < 565; x += 15) r(x, 166, 3, 79, "#344b51");
  r(424, 137, 166, 5, "#6a746b");
  r(600, 93, 6, 178, "#111f29");
  r(579, 91, 31, 5, "#111f29");
  r(579, 96, 11, 4, "#f2cc88");
  c.strokeStyle = "#172833";
  c.beginPath();
  c.moveTo(0, 108);
  c.quadraticCurveTo(315, 194, 640, 103);
  c.stroke();
  r(0, 267, 640, 93, "#3e4b4e");
  r(0, 267, 640, 6, "#788078");
  r(0, 273, 640, 5, "#27373d");
  for (let i = 0; i < 9; i++) {
    c.strokeStyle = "#303e43";
    c.beginPath();
    c.moveTo(320 + (i - 4) * 61, 278);
    c.lineTo(320 + (i - 4) * 130, 360);
    c.stroke();
  }
  for (const y of [294, 317, 348]) r(0, y, 640, 1, "#53605f");
  r(75, 236, 23, 31, "#84674e");
  r(78, 234, 17, 4, "#a18461");
  r(78, 246, 17, 2, "#3b4443");
  r(535, 248, 35, 18, "#1a2a32");
  r(541, 243, 23, 6, "#1a2a32");
  c.globalAlpha = 0.15;
  for (let y = 0; y < 360; y += 3) r(0, y, 640, 1, "#000000");
  c.globalAlpha = 1;
  t.refresh();
}
