import { test, expect, type Page } from "@playwright/test";

const keys = [
  {
    left: "KeyA",
    right: "KeyD",
    down: "KeyS",
    up: "KeyW",
    punch: "KeyF",
    kick: "KeyG",
    special: "KeyH",
  },
  {
    left: "ArrowLeft",
    right: "ArrowRight",
    down: "ArrowDown",
    up: "ArrowUp",
    punch: "KeyJ",
    kick: "KeyK",
    special: "KeyL",
  },
];
const tick = (page: Page, frames = 1) => page.clock.runFor(frames * 17);
async function hold(page: Page, buttons: string[], frames: number) {
  for (const key of buttons) await page.keyboard.down(key);
  await tick(page, frames);
  for (const key of buttons) await page.keyboard.up(key);
}
async function read(page: Page, player: number) {
  return page.locator("canvas").evaluate(
    (canvas, p) => ({
      x: Number(canvas.dataset[`p${p}X`]),
      y: Number(canvas.dataset[`p${p}Y`]),
      stun: Number(canvas.dataset[`p${p}GuardStun`]),
      stance: canvas.dataset[`p${p}Stance`],
      animation: canvas.dataset[`p${p}Animation`],
    }),
    player + 1,
  );
}

for (const defender of [0, 1])
  for (const reversed of [false, true]) {
    test(`P${defender + 1}: bloqueo, chip y stun; lados invertidos=${reversed}`, async ({
      page,
    }) => {
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.goto("/");
      await expect(page.locator("#app")).toHaveAttribute("data-ready", "true");
      await page.clock.install();
      await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
      const attacker = 1 - defender;
      const a = keys[attacker],
        d = keys[defender];
      const defenderOnRight = (defender === 1) !== reversed;
      const back = defenderOnRight ? d.right : d.left;
      const health = page.getByRole("progressbar", {
        name: `Vida jugador ${defender + 1}`,
      });

      async function start() {
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
        // Use real input to put the defender at a wall; holding back cannot leave range.
        await hold(
          page,
          keys.map((k) => (defenderOnRight ? k.right : k.left)),
          240,
        );
        const p0 = await read(page, 0),
          p1 = await read(page, 1);
        expect(p0.x > p1.x, JSON.stringify({ p0, p1 })).toBe(reversed);
        expect(Math.abs(p0.x - p1.x)).toBe(200);
      }
      async function finish() {
        for (const k of [...Object.values(a), ...Object.values(d)])
          await page.keyboard.up(k);
        await page.keyboard.press("Escape");
        await page
          .getByRole("button", { name: "SALIR AL MENÚ" })
          .click({ force: true });
      }
      async function attackUntilContact(
        button: string,
        expectedHP: number,
        blocked: boolean,
      ) {
        await page.keyboard.down(button);
        let state = await read(page, defender);
        for (let i = 0; i < 30; i++) {
          await tick(page);
          state = await read(page, defender);
          if (
            state.stun > 0 ||
            Number(await health.getAttribute("aria-valuenow")) < 100
          )
            break;
        }
        await page.keyboard.up(button);
        await expect(health).toHaveAttribute(
          "aria-valuenow",
          String(expectedHP),
        );
        expect(state.stun > 0).toBe(blocked);
        if (!blocked) expect(state.animation).toBe("hurt");
        return state;
      }

      // Standing mid block and prohibited actions throughout the guard-stun window.
      await start();
      await page.keyboard.down(back);
      let state = await attackUntilContact(a.kick, 100, true);
      expect(state.animation).toBe("block");
      await page.screenshot({
        path: `test-results/p${defender + 1}-standing-block-${reversed}.png`,
      });
      for (const key of [d.up, d.punch, d.kick, d.special])
        await page.keyboard.down(key);
      const x = state.x;
      while (state.stun > 0) {
        await tick(page);
        state = await read(page, defender);
        expect(state.x).toBe(x);
        expect(state.y).toBe(0);
        if (state.stun > 0) expect(state.animation).toBe("block");
      }
      await tick(page, 2);
      state = await read(page, defender);
      expect(state.y).toBe(0);
      expect(state.animation).not.toMatch(/punch|kick|special|rise/);
      await finish();

      // Crouching low block, plus an in-stun posture change.
      await start();
      await page.keyboard.down(back);
      await page.keyboard.down(d.down);
      await page.keyboard.down(a.down);
      state = await attackUntilContact(a.kick, 100, true);
      expect(state.stance).toBe("crouching");
      expect(state.animation).toBe("crouch");
      await page.screenshot({
        path: `test-results/p${defender + 1}-crouching-block-${reversed}.png`,
      });
      await page.keyboard.up(d.down);
      await tick(page);
      expect((await read(page, defender)).animation).toBe("block");
      await finish();

      await start();
      await page.keyboard.down(back);
      await page.keyboard.down(a.down);
      await attackUntilContact(a.kick, 89, false);
      await finish();

      // Special contacts crouching bodies too; both guards take exactly 2 chip.
      for (const crouching of [false, true]) {
        await start();
        await page.keyboard.down(back);
        if (crouching) await page.keyboard.down(d.down);
        await attackUntilContact(a.special, 98, true);
        await tick(page, 8);
        await expect(health).toHaveAttribute("aria-valuenow", "98");
        await finish();
      }

      // Start a descending aerial kick: its active frames reach the crouching body
      // near landing, while retaining the overhead type resolved at attack startup.
      await start();
      await page.keyboard.down(back);
      await page.keyboard.down(d.down);
      await hold(page, [a.up], 28);
      expect((await read(page, attacker)).y).toBeGreaterThan(0);
      await attackUntilContact(a.kick, 89, false);
      await finish();
      expect(errors).toEqual([]);
    });
  }
