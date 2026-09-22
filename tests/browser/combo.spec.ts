import { test, expect, type Page } from "@playwright/test";
const keys = [
  {
    left: "KeyA",
    right: "KeyD",
    up: "KeyW",
    punch: "KeyF",
    kick: "KeyG",
    special: "KeyH",
    block: "KeyE",
  },
  {
    left: "ArrowLeft",
    right: "ArrowRight",
    up: "ArrowUp",
    punch: "KeyJ",
    kick: "KeyK",
    special: "KeyL",
    block: "KeyI",
  },
];
const tick = (page: Page, frames = 1) => page.clock.runFor(frames * 17);
async function hold(page: Page, buttons: string[], frames: number) {
  for (const key of buttons) await page.keyboard.down(key);
  await tick(page, frames);
  for (const key of buttons) await page.keyboard.up(key);
}
for (const attacker of [0, 1])
  for (const reversed of [false, true]) {
    test(`combos P${attacker + 1}, lados invertidos=${reversed}`, async ({
      page,
    }) => {
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      if (reversed) await page.setViewportSize({ width: 390, height: 844 });
      await page.goto("/");
      await expect(page.locator("#app")).toHaveAttribute("data-ready", "true");
      await page.clock.install();
      await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
      await page
        .getByRole("button", { name: "JUGAR VERSUS" })
        .click({ force: true });
      await page
        .getByRole("button", { name: "¡A PELEAR!" })
        .click({ force: true });
      await tick(page, 2);
      if (reversed) {
        await hold(page, [keys[0].right], 80);
        await hold(page, [keys[0].right, keys[0].up], 50);
      }
      const target = 1 - attacker;
      const targetRight = (target === 1) !== reversed;
      await hold(
        page,
        keys.map((k) => (targetRight ? k.right : k.left)),
        240,
      );
      const canvas = page.locator("canvas");
      const health = page.getByRole("progressbar", {
        name: `Vida jugador ${target + 1}`,
      });
      const counter = page.getByLabel(`Combo jugador ${attacker + 1}`, {
        exact: true,
      });
      const otherCounter = page.getByLabel(`Combo jugador ${target + 1}`, {
        exact: true,
      });
      expect(
        Number(await canvas.getAttribute("data-p1-x")) >
          Number(await canvas.getAttribute("data-p2-x")),
      ).toBe(reversed);
      async function until(predicate: () => Promise<boolean>, max = 65) {
        for (let n = 0; n < max; n++) {
          if (await predicate()) return;
          await tick(page);
        }
        throw new Error("Expected combat state was not reached");
      }
      async function attack(key: string, hp: number) {
        await until(
          async () =>
            (await canvas.getAttribute(
              `data-p${attacker + 1}-attack-phase`,
            )) === "none",
        );
        await page.keyboard.down(key);
        await until(
          async () => Number(await health.getAttribute("aria-valuenow")) === hp,
        );
        await page.keyboard.up(key);
      }
      await attack(keys[attacker].punch, 93);
      await expect(counter).toBeHidden();
      await page.keyboard.down(keys[target].block);
      await attack(keys[attacker].kick, 82);
      await expect(counter).toHaveText("2 HITS");
      await expect(counter).toBeVisible();
      await expect(otherCounter).toBeHidden();
      await attack(keys[attacker].special, 64);
      await expect(counter).toHaveText("3 HITS");
      await page.screenshot({
        path: `test-results/combo-p${attacker + 1}-${reversed ? "small" : "desktop"}.png`,
      });
      await tick(page, 8);
      await expect(counter).toHaveText("3 HITS");
      await expect(health).toHaveAttribute("aria-valuenow", "64");
      await page.keyboard.press("Escape");
      await tick(page, 120);
      await expect(counter).toHaveText("3 HITS");
      await page
        .getByRole("button", { name: "VOLVER AL COMBATE" })
        .click({ force: true });
      await until(
        async () =>
          (await canvas.getAttribute(`data-p${target + 1}-hit-stun`)) === "0",
      );
      await expect(counter).toBeVisible();
      // Pausing after the chain ends also freezes the retained result.
      await page.keyboard.press("Escape");
      await tick(page, 120);
      await expect(counter).toBeVisible();
      await page
        .getByRole("button", { name: "VOLVER AL COMBATE" })
        .click({ force: true });
      await tick(page, 65);
      await expect(counter).toBeHidden();
      await page.keyboard.down(keys[target].block);
      await hold(page, [keys[attacker].kick], 40);
      await expect(health).toHaveAttribute("aria-valuenow", "64");
      await expect(counter).toBeHidden();
      await tick(page, 180);
      await attack(keys[attacker].special, 62);
      await tick(page, 10);
      await expect(health).toHaveAttribute("aria-valuenow", "62");
      await expect(counter).toBeHidden();
      await expect(otherCounter).toBeHidden();
      await page.keyboard.up(keys[target].block);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBe(reversed ? 390 : 1440);
      expect(errors).toEqual([]);
    });
  }
