import { test, expect } from "@playwright/test";

test("el control de sonido se guarda y restaura", async ({ page }) => {
  await page.goto("/");
  const sound = page.locator("#sound");
  await expect(sound).toContainText("SONIDO ON");
  await expect(sound).toHaveAttribute("aria-label", "Silenciar sonido");
  await sound.click();
  await expect(sound).toContainText("SONIDO OFF");
  await expect(sound).toHaveAttribute("aria-label", "Activar sonido");
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem("ff-muted")))
    .toBe("true");
  await page.reload();
  await expect(sound).toContainText("SONIDO OFF");
  await sound.click();
  await expect(sound).toContainText("SONIDO ON");
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem("ff-muted")))
    .toBe("false");
});

test("música y efectos conservan preferencias independientes", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  const music = page.locator("#music");
  const sound = page.locator("#sound");
  await expect(music).toHaveText("MÚSICA ON");
  await expect(music).toHaveAttribute("aria-label", "Silenciar música");
  await music.click();
  await expect(music).toHaveText("MÚSICA OFF");
  await expect(sound).toContainText("SONIDO ON");
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem("ff-music-muted")))
    .toBe("true");
  await page.reload();
  await expect(music).toHaveText("MÚSICA OFF");
  await sound.click();
  await expect(music).toHaveText("MÚSICA OFF");
  await music.click();
  await expect(music).toHaveText("MÚSICA ON");
  await expect(sound).toContainText("SONIDO OFF");
  await page.getByRole("button", { name: "ENTRAR A PRÁCTICA" }).click();
  await page.getByRole("button", { name: "PRACTICAR", exact: false }).click();
  await page.keyboard.press("Escape");
  await expect(page.locator(".pause-panel")).toBeVisible();
  await page.getByRole("button", { name: "VOLVER AL COMBATE" }).click();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "SALIR AL MENÚ" }).click();
  await expect(page.getByRole("button", { name: "JUGAR VERSUS" })).toBeVisible();
  expect(errors).toEqual([]);
});

test("inicio, selección, controles guardados, práctica, pausa y reinicio", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.locator("canvas")).toBeVisible();
  await page.screenshot({
    path: "test-results/menu-desktop.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "GUÍA DE CONTROLES" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.locator('[data-bind="block"][data-player="0"]')).toHaveText(
    "E",
  );
  await expect(page.locator('[data-bind="block"][data-player="1"]')).toHaveText(
    "I",
  );
  await expect(page.getByRole("dialog")).toContainText("Y / △: bloqueo");
  await page.locator('[data-bind="punch"][data-player="0"]').click();
  await page.keyboard.press("KeyQ");
  await expect(page.locator('[data-bind="punch"][data-player="0"]')).toHaveText(
    "Q",
  );
  await page.getByRole("button", { name: "Cerrar controles" }).click();
  await page.reload();
  await page.getByRole("button", { name: "ENTRAR A PRÁCTICA" }).click();
  await expect(page.locator(".selection-panel")).toBeVisible();
  await page.getByRole("button", { name: "PRACTICAR", exact: false }).click();
  await expect(page.locator("#hud")).toContainText("∞");
  await page.keyboard.down("KeyD");
  await page.waitForTimeout(1600);
  await page.keyboard.up("KeyD");
  await page.keyboard.press("KeyQ");
  await page.waitForTimeout(300);
  await expect(page.locator(".player-1 .health-track i")).not.toHaveAttribute(
    "style",
    "width:100%",
  );
  await page.getByRole("button", { name: "REINICIAR PRÁCTICA" }).click();
  await expect(page.locator(".player-1 .health-track i")).toHaveAttribute(
    "style",
    "width:100%",
  );
  await page.keyboard.press("Escape");
  await expect(page.locator(".pause-panel")).toBeVisible();
  await page.getByRole("button", { name: "VOLVER AL COMBATE" }).click();
  await expect(page.locator(".pause-panel")).toHaveCount(0);
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  await expect(page.locator(".pause-panel")).toContainText(
    "CAMBIAR DE VENTANA",
  );
  await page.getByRole("button", { name: "SALIR AL MENÚ" }).click();
  await expect(
    page.getByRole("button", { name: "JUGAR VERSUS" }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
test("partida real con teclado, resultado y revancha", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "JUGAR VERSUS" }).click();
  await page.getByRole("button", { name: "¡A PELEAR!" }).click();
  // Drive real keyboard input against a stationary second player, across both rounds.
  for (let round = 0; round < 2; round++) {
    await page.keyboard.down("KeyD");
    await page.waitForTimeout(1600);
    for (let hit = 0; hit < 22; hit++) {
      if (
        (await page.locator(".result-panel").count()) ||
        (await page.locator(".round-message").count())
      )
        break;
      await page.keyboard.press("KeyF");
      await page.waitForTimeout(450);
    }
    await page.keyboard.up("KeyD");
    if (round === 0) {
      await expect(page.locator(".round-message")).toBeVisible();
      await expect(page.locator(".round-message")).toHaveCount(0, {
        timeout: 6000,
      });
    }
  }
  await expect(page.locator(".result-panel")).toContainText("LAURA GANA");
  await page.screenshot({ path: "test-results/result.png" });
  await page.getByRole("button", { name: "OTRA RONDA ENTRE AMIGOS" }).click();
  await expect(page.locator(".result-panel")).toHaveCount(0);
  await expect(page.locator(".player-0 .health-track i")).toHaveAttribute(
    "style",
    "width:100%",
  );
  await expect(page.locator(".timer")).toContainText("ROUND 1");
});
test("Laura y Sebastian se eligen por esquina y permiten combate espejo", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "JUGAR VERSUS" }).click();

  await expect(
    page.getByRole("button", { name: "Elegir LAURA para jugador 1" }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByRole("button", { name: "Elegir SEBASTIAN para jugador 2" }),
  ).toHaveAttribute("aria-pressed", "true");

  await page
    .getByRole("button", { name: "Elegir SEBASTIAN para jugador 1" })
    .click();
  await expect(
    page.getByRole("button", { name: "Elegir SEBASTIAN para jugador 1" }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "¡A PELEAR!" }).click();

  const canvas = page.locator("canvas");
  await expect(canvas).toHaveAttribute("data-p1-character", "sebastian");
  await expect(canvas).toHaveAttribute("data-p2-character", "sebastian");
  await expect(page.locator(".player-0")).toContainText("SEBASTIAN");
  await expect(page.locator(".player-1")).toContainText("SEBASTIAN");
  await page.keyboard.press("KeyF");
  await expect(canvas).toHaveAttribute(
    "data-p1-animation",
    /punch-wind|punch-hit/,
  );
});
test("selección impide asignar el mismo mando a dos jugadores", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const pad = {
      index: 0,
      id: "Virtual standard controller",
      mapping: "standard",
      buttons: Array.from({ length: 17 }, () => ({
        pressed: false,
        value: 0,
        touched: false,
      })),
      axes: [0, 0],
    };
    Object.defineProperty(navigator, "getGamepads", { value: () => [pad] });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "JUGAR VERSUS" }).click();
  await page.selectOption("#device-0", "0");
  await page.selectOption("#device-1", "0");
  await page.getByRole("button", { name: "¡A PELEAR!" }).click();
  await expect(page.locator("#device-hint")).toContainText("mando distinto");
});
test("vista estrecha conserva navegación y proporción", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "JUGAR VERSUS" }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/menu-small.png",
    fullPage: true,
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    390,
  );
});
test("mando asignado: pausa con Start y desconexión segura", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const state = {
      pad: {
        index: 0,
        id: "Test pad",
        mapping: "standard",
        buttons: Array.from({ length: 17 }, () => ({
          pressed: false,
          value: 0,
          touched: false,
        })),
        axes: [0, 0],
      },
      connected: true,
    };
    Object.assign(window, { testPadState: state });
    Object.defineProperty(navigator, "getGamepads", {
      value: () => (state.connected ? [state.pad] : [null]),
    });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "JUGAR VERSUS" }).click();
  await page.selectOption("#device-0", "0");
  await page.getByRole("button", { name: "¡A PELEAR!" }).click();
  await page.evaluate(() => {
    (window as any).testPadState.pad.buttons[9].pressed = true;
  });
  await expect(page.locator(".pause-panel")).toBeVisible();
  await page.evaluate(() => {
    (window as any).testPadState.pad.buttons[9].pressed = false;
  });
  await page.getByRole("button", { name: "VOLVER AL COMBATE" }).click();
  await page.evaluate(() => {
    const state = (window as any).testPadState;
    state.connected = false;
    window.dispatchEvent(
      Object.assign(new Event("gamepaddisconnected"), { gamepad: state.pad }),
    );
  });
  await expect(page.locator(".pause-panel")).toContainText(
    "MANDO DESCONECTADO",
  );
  await page.getByRole("button", { name: "VOLVER AL COMBATE" }).click();
  await expect(page.locator("#pause-hint")).toContainText("Reconecta");
});
