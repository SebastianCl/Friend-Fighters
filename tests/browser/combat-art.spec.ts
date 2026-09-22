import { test, expect } from "@playwright/test";
import { animationRegions } from "../../src/animation";

test("nuevas ilustraciones listas, sin poses vacías ni recortes en sus límites", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator("#app")).toHaveAttribute("data-ready", "true");
  const metrics = await page.evaluate(async (regions) => {
    const sheets: Record<string, { pixels: Uint8ClampedArray; width: number }> =
      {};
    for (const [sheet, url] of [
      ["guard", "/art/visual-v1/fighter-guard.png"],
      ["motion", "/art/combat-v2/movement-sheet.png"],
      ["air", "/art/combat-v2/air-sheet-v2.png"],
    ]) {
      const img = new Image();
      img.src = url;
      await img.decode();
      const c = document.createElement("canvas");
      c.width = img.width;
      c.height = img.height;
      const ctx = c.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      sheets[sheet] = {
        pixels: ctx.getImageData(0, 0, c.width, c.height).data,
        width: c.width,
      };
    }
    return regions.map((r) => {
      const s = sheets[r.sheet];
      let count = 0,
        edge = 0;
      for (let y = 0; y < r.height; y++)
        for (let x = 0; x < r.width; x++) {
          if (s.pixels[((r.y + y) * s.width + r.x + x) * 4 + 3] > 128) {
            count++;
            if (x === 0 || y === 0 || x === r.width - 1 || y === r.height - 1)
              edge++;
          }
        }
      return { key: r.key, count, edge };
    });
  }, animationRegions);
  for (const frame of metrics) {
    expect(frame.count, frame.key).toBeGreaterThan(1500);
    expect(frame.edge, `${frame.key} toca el borde`).toBe(0);
  }
});

test("cada jugador conserva su tamaño al saltar, caminar y atacar", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/");
  await expect(page.locator("#app")).toHaveAttribute("data-ready", "true");
  await page.getByRole("button", { name: "JUGAR VERSUS" }).click();
  await page.getByRole("button", { name: "¡A PELEAR!" }).click();
  const canvas = page.locator("canvas");

  const expectFixedPresentation = async () => {
    const metrics = await canvas.evaluate((element) => ({
      zoom: Number(element.dataset.cameraZoom),
      p1Height: Number(element.dataset.p1RenderedHeight),
      p2Height: Number(element.dataset.p2RenderedHeight),
    }));
    expect(metrics.zoom).toBeCloseTo(1, 3);
    expect(metrics.p1Height).toBeCloseTo(420, 3);
    expect(metrics.p2Height).toBeCloseTo(420, 3);
  };

  await expect(canvas).toHaveAttribute("data-p1-animation", /guard|breathe/);
  await expect(canvas).toHaveAttribute("data-p2-animation", /guard|breathe/);
  await expectFixedPresentation();

  for (const [key, player] of [
    ["KeyA", 1],
    ["ArrowRight", 2],
  ] as const) {
    await page.keyboard.down(key);
    await expect(canvas).toHaveAttribute(`data-p${player}-animation`, /walk-/);
    await expectFixedPresentation();
    await page.keyboard.up(key);
  }

  for (const [key, player] of [
    ["KeyF", 1],
    ["KeyJ", 2],
  ] as const) {
    await page.keyboard.press(key);
    await expect(canvas).toHaveAttribute(
      `data-p${player}-animation`,
      /punch-wind|punch-hit/,
    );
    await expectFixedPresentation();
    await expect(canvas).toHaveAttribute(`data-p${player}-animation`, /guard/, {
      timeout: 2000,
    });
  }

  const verifyJump = async (
    key: "KeyW" | "ArrowUp",
    player: 1 | 2,
    otherPlayer: 1 | 2,
  ) => {
    await page.keyboard.press(key);
    await expect(canvas).toHaveAttribute(`data-p${player}-animation`, "rise");
    const seen = new Set<string>(["rise"]);
    await page.keyboard.press("Escape");
    await expect(page.locator(".pause-panel")).toBeVisible();
    await expectFixedPresentation();
    await canvas.screenshot({
      path: `test-results/p${player}-jump-fixed.png`,
    });
    await page.getByRole("button", { name: "VOLVER AL COMBATE" }).click();
    for (let sample = 0; sample < 30; sample++) {
      const animations = await canvas.evaluate(
        (element, players) => ({
          jumping: element.dataset[`p${players.player}Animation`],
          other: element.dataset[`p${players.otherPlayer}Animation`],
        }),
        { player, otherPlayer },
      );
      if (animations.jumping) seen.add(animations.jumping);
      expect(animations.other).not.toMatch(/rise|land/);
      await expectFixedPresentation();
      await page.waitForTimeout(30);
    }
    expect(seen).toContain("rise");
    expect(seen).toContain("land");
    await expect(canvas).toHaveAttribute(
      `data-p${player}-animation`,
      /guard|breathe/,
    );
    await expectFixedPresentation();
  };

  await verifyJump("KeyW", 1, 2);
  await verifyJump("ArrowUp", 2, 1);
});

test("poses reales de combate, cámara fija, pausa y pantalla completa", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/");
  await expect(page.locator("#app")).toHaveAttribute("data-ready", "true");
  await page.screenshot({ path: "docs/combat-v2/menu.png" });
  await page.getByRole("button", { name: "ENTRAR A PRÁCTICA" }).click();
  await page.screenshot({ path: "docs/combat-v2/selection.png" });
  await page.getByRole("button", { name: "PRACTICAR", exact: false }).click();
  const canvas = page.locator("canvas");
  await page.screenshot({ path: "docs/combat-v2/guard.png" });
  await page.keyboard.down("KeyD");
  await expect(canvas).toHaveAttribute("data-p1-animation", /walk-/);
  await page.waitForTimeout(1250);
  await page.keyboard.up("KeyD");
  await page.keyboard.press("KeyG");
  await expect(canvas).toHaveAttribute("data-p1-animation", "kick-hit");
  await page.screenshot({ path: "docs/combat-v2/kick.png" });
  await expect(
    page.getByRole("progressbar", { name: "Vida jugador 2" }),
  ).not.toHaveAttribute("aria-valuenow", "100");
  await page.waitForTimeout(650);
  await page.keyboard.down("KeyS");
  await expect(canvas).toHaveAttribute("data-p1-animation", "crouch");
  await page.screenshot({ path: "docs/combat-v2/crouch.png" });
  await page.keyboard.up("KeyS");
  await page.keyboard.press("KeyW");
  await expect(canvas).toHaveAttribute("data-p1-animation", /rise|land/);
  await page.waitForTimeout(140);
  expect(Number(await canvas.getAttribute("data-camera-zoom"))).toBe(1);
  await page.screenshot({ path: "docs/combat-v2/jump.png" });
  await page.waitForTimeout(650);
  await page.keyboard.press("KeyH");
  await expect(canvas).toHaveAttribute("data-p1-animation", "special-wind");
  await page.waitForFunction(
    () =>
      document.querySelector("canvas")?.dataset.p1Animation === "special-hit",
  );
  await page.screenshot({ path: "docs/combat-v2/special.png" });
  await page.keyboard.press("Escape");
  await expect(page.locator(".pause-panel")).toBeVisible();
  const frozen = await canvas.getAttribute("data-p1-animation");
  await page.waitForTimeout(150);
  await expect(canvas).toHaveAttribute("data-p1-animation", frozen!);
  await page
    .getByRole("button", { name: "Pantalla completa", exact: true })
    .click();
  await expect(page.locator("#fullscreen")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page
    .getByRole("button", { name: "Salir de pantalla completa", exact: true })
    .click();
});
