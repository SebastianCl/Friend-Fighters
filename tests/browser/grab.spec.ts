import { expect, test } from "@playwright/test";

for (const character of ["laura", "sebastian", "rata", "mariana"] as const) {
  test(`agarre aéreo de ${character}, pausa y aterrizaje`, async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("#app")).toHaveAttribute("data-ready", "true");
    await page.getByRole("button", { name: "GUÍA DE CONTROLES" }).click();
    await expect(
      page.locator('[data-bind="grab"][data-player="0"]'),
    ).toHaveText("C");
    await expect(
      page.locator('[data-bind="grab"][data-player="1"]'),
    ).toHaveText("M");
    await expect(page.getByRole("dialog")).toContainText(
      "B: puño · A: patada · L: agarre · R: bloqueo · ZL: especial",
    );
    await page.getByRole("button", { name: "Cerrar controles" }).click();

    await page.getByRole("button", { name: "ENTRAR A PRÁCTICA" }).click();
    await page
      .locator(`[data-player="0"][data-character="${character}"]`)
      .click();
    await page.getByRole("button", { name: "PRACTICAR", exact: false }).click();
    const canvas = page.locator("canvas");
    await expect(canvas).toHaveAttribute("data-p1-character", character);
    await page.keyboard.down("KeyD");
    await page.waitForFunction(() => {
      const data = document.querySelector("canvas")!.dataset;
      return Number(data.p2X) - Number(data.p1X) <= 220;
    });
    await page.keyboard.up("KeyD");
    await page.keyboard.press("KeyC");
    await page.waitForFunction(
      () => Number(document.querySelector("canvas")!.dataset.p2Y) > 0,
    );
    await expect(canvas).toHaveAttribute("data-p2-animation", "fall");
    await page.keyboard.press("Escape");
    const heldY = await canvas.getAttribute("data-p2-y");
    await page.waitForTimeout(200);
    await expect(canvas).toHaveAttribute("data-p2-y", heldY!);
    await page.getByRole("button", { name: "VOLVER AL COMBATE" }).click();
    await expect(page.locator(".player-1 .health-track")).toHaveAttribute(
      "aria-valuenow",
      "84",
    );
    await expect(canvas).toHaveAttribute("data-p2-y", "0");
  });
}
