import { expect, test, type Page } from "@playwright/test";

const tick = (page: Page, frames = 1) => page.clock.runFor(frames * 17);

async function hold(page: Page, keys: string[], frames: number) {
  for (const key of keys) await page.keyboard.down(key);
  await tick(page, frames);
  for (const key of keys) await page.keyboard.up(key);
}

async function startFight(page: Page) {
  await page.goto("/");
  const canvas = page.locator("canvas");
  await expect(page.locator("#app")).toHaveAttribute("data-ready", "true");
  await page.clock.install();
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
  await page.getByRole("button", { name: "JUGAR VERSUS" }).click();
  await page.getByRole("button", { name: "¡A PELEAR!" }).click();
  await hold(page, ["KeyD", "ArrowRight"], 240);
  await expect(canvas).toHaveAttribute("data-camera-shake-active", "false");
  return canvas;
}

test("reinicia el shake en impactos simultáneos y vuelve a cámara normal", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));

  const canvas = await startFight(page);
  const healthP1 = page.getByRole("progressbar", { name: "Vida jugador 1" });
  const healthP2 = page.getByRole("progressbar", { name: "Vida jugador 2" });

  await page.keyboard.down("KeyF");
  await page.keyboard.down("KeyJ");
  for (let frame = 0; frame < 20; frame++) {
    await tick(page);
    if (
      (await healthP1.getAttribute("aria-valuenow")) === "93" &&
      (await healthP2.getAttribute("aria-valuenow")) === "93"
    )
      break;
  }
  await page.keyboard.up("KeyF");
  await page.keyboard.up("KeyJ");

  await expect(healthP1).toHaveAttribute("aria-valuenow", "93");
  await expect(healthP2).toHaveAttribute("aria-valuenow", "93");
  await expect(canvas).toHaveAttribute("data-camera-shake-active", "true");
  await expect(canvas).toHaveAttribute("data-screen-flash-active", "true");
  await expect(canvas).toHaveAttribute("data-camera-zoom", "1.000");

  await tick(page, 10);
  await expect(canvas).toHaveAttribute("data-camera-shake-active", "false");
  await expect(canvas).toHaveAttribute("data-screen-flash-active", "false");
  await expect(canvas).toHaveAttribute("data-camera-zoom", "1.000");
  expect(errors).toEqual([]);
});

test("un bloqueo no inicia Camera Shake y el combate sigue funcionando", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));

  const canvas = await startFight(page);
  const health = page.getByRole("progressbar", { name: "Vida jugador 2" });
  await page.keyboard.down("KeyI");
  await page.keyboard.down("KeyF");
  for (let frame = 0; frame < 30; frame++) {
    await tick(page);
    if ((await canvas.getAttribute("data-p2-animation")) === "block") break;
  }
  await page.keyboard.up("KeyF");
  await page.keyboard.up("KeyI");

  await expect(health).toHaveAttribute("aria-valuenow", "100");
  await expect(canvas).toHaveAttribute("data-p2-animation", "block");
  await expect(canvas).toHaveAttribute("data-camera-shake-active", "false");
  await expect(canvas).toHaveAttribute("data-screen-flash-active", "false");

  await page.keyboard.down("KeyF");
  for (let frame = 0; frame < 30; frame++) {
    await tick(page);
    if ((await health.getAttribute("aria-valuenow")) === "93") break;
  }
  await page.keyboard.up("KeyF");
  await expect(health).toHaveAttribute("aria-valuenow", "93");
  await expect(canvas).toHaveAttribute("data-camera-shake-active", "true");
  await expect(canvas).toHaveAttribute("data-screen-flash-active", "true");
  expect(errors).toEqual([]);
});
