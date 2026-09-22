import { expect, test, type Page } from "@playwright/test";

const tick = (page: Page, frames = 1) => page.clock.runFor(frames * 17);

async function hold(page: Page, keys: string[], frames: number) {
  for (const key of keys) await page.keyboard.down(key);
  await tick(page, frames);
  for (const key of keys) await page.keyboard.up(key);
}

async function startFight(page: Page) {
  await page.goto("/");
  await expect(page.locator("#app")).toHaveAttribute("data-ready", "true");
  await page.clock.install();
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
  await page.getByRole("button", { name: "JUGAR VERSUS" }).click();
  await page.getByRole("button", { name: "¡A PELEAR!" }).click();
  await hold(page, ["KeyD", "ArrowRight"], 240);
}

async function goldPixelsNear(page: Page, x: number, y: number) {
  return page.locator("canvas").evaluate(
    (canvas, point) => {
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Canvas 2D context is unavailable");
      const left = Math.max(0, Math.floor(point.x - 18));
      const top = Math.max(0, Math.floor(point.y - 18));
      const width = Math.min(canvas.width - left, 37);
      const height = Math.min(canvas.height - top, 37);
      const points: { x: number; y: number }[] = [];
      function collectPixels(
        regionLeft: number,
        regionTop: number,
        regionWidth: number,
        regionHeight: number,
      ) {
        const pixels = context.getImageData(
          regionLeft,
          regionTop,
          regionWidth,
          regionHeight,
        ).data;
        for (let py = 0; py < regionHeight; py++) {
          for (let px = 0; px < regionWidth; px++) {
            const offset = (py * regionWidth + px) * 4;
            const [red, green, blue, alpha] = pixels.slice(offset, offset + 4);
            if (
              red > 220 &&
              green > 140 &&
              green < 235 &&
              blue < 80 &&
              alpha > 0
            )
              points.push({ x: regionLeft + px, y: regionTop + py });
          }
        }
      }
      collectPixels(left, top, width, height);
      if (points.length === 0) return { count: 0, width: 0, height: 0 };
      const xs = points.map((pixel) => pixel.x);
      const ys = points.map((pixel) => pixel.y);
      return {
        count: points.length,
        width: Math.max(...xs) - Math.min(...xs) + 1,
        height: Math.max(...ys) - Math.min(...ys) + 1,
      };
    },
    { x, y },
  );
}

test("muestra hit sparks light, medium y heavy en el punto de contacto", async ({
  page,
}) => {
  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  await startFight(page);
  const health = page.getByRole("progressbar", { name: "Vida jugador 2" });
  const canvas = page.locator("canvas");
  const attacks = [
    { key: "KeyF", hp: 93, contactHeight: 155 },
    { key: "KeyG", hp: 82, contactHeight: 135 },
    { key: "KeyH", hp: 64, contactHeight: 135 },
  ];
  const sparkSizes: number[] = [];

  for (const attack of attacks) {
    for (let frame = 0; frame < 60; frame++) {
      if ((await canvas.getAttribute("data-p1-attack-phase")) === "none") break;
      await tick(page);
    }
    await expect(canvas).toHaveAttribute("data-p1-attack-phase", "none");
    await page.keyboard.down(attack.key);
    for (let frame = 0; frame < 40; frame++) {
      await tick(page);
      if (Number(await health.getAttribute("aria-valuenow")) === attack.hp)
        break;
    }
    await page.keyboard.up(attack.key);
    await expect(health).toHaveAttribute("aria-valuenow", String(attack.hp));

    const point = await canvas.evaluate((element, height) => {
      const targetX = Number(element.dataset.p2X);
      const attackerY = Number(element.dataset.p1Y);
      return { x: targetX - 60, y: 612 - (attackerY + height) * 2 };
    }, attack.contactHeight);
    const spark = await goldPixelsNear(page, point.x, point.y);
    expect(
      spark.count,
      `spark esperado cerca de ${JSON.stringify(point)}`,
    ).toBeGreaterThan(0);
    sparkSizes.push(spark.width);
  }

  expect(sparkSizes[0]).toBeLessThan(sparkSizes[1]);
  expect(sparkSizes[1]).toBeLessThan(sparkSizes[2]);
  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});

test("un golpe bloqueado no crea un hit spark y el combate sigue activo", async ({
  page,
}) => {
  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  await startFight(page);
  const health = page.getByRole("progressbar", { name: "Vida jugador 2" });
  const canvas = page.locator("canvas");
  const blockedPoint = await canvas.evaluate((element) => ({
    x: Number(element.dataset.p2X) - 60,
    y: 612 - 155 * 2,
  }));
  const goldBeforeBlock = await goldPixelsNear(
    page,
    blockedPoint.x,
    blockedPoint.y,
  );
  await page.keyboard.down("KeyI");
  await page.keyboard.down("KeyF");
  for (let frame = 0; frame < 40; frame++) {
    await tick(page);
    if (
      (await page.locator("canvas").getAttribute("data-p2-animation")) ===
      "block"
    )
      break;
  }
  await page.keyboard.up("KeyF");
  await page.keyboard.up("KeyI");
  await expect(health).toHaveAttribute("aria-valuenow", "100");
  await expect(page.locator("canvas")).toHaveAttribute(
    "data-p2-animation",
    "block",
  );
  const goldAfterBlock = await goldPixelsNear(
    page,
    blockedPoint.x,
    blockedPoint.y,
  );
  expect(goldAfterBlock.count).toBe(goldBeforeBlock.count);

  await page.keyboard.down("KeyF");
  for (let frame = 0; frame < 40; frame++) {
    await tick(page);
    if (Number(await health.getAttribute("aria-valuenow")) < 100) break;
  }
  await page.keyboard.up("KeyF");
  await expect(health).toHaveAttribute("aria-valuenow", "93");
  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});
