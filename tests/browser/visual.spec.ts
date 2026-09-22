import { test, expect } from "@playwright/test";
import { visualFighter, visualStage } from "../../src/visual-assets";

for (const size of [
  { width: 1280, height: 720 },
  { width: 1920, height: 1080 },
]) {
  test(`arena visual completa a ${size.width} × ${size.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(size);
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const missing: string[] = [];
    page.on("response", (response) => {
      if (response.status() >= 400 && response.url().includes("/art/"))
        missing.push(response.url());
    });
    await page.goto("/visual-preview.html");
    await expect(page.locator("#visual-app")).toHaveAttribute(
      "data-ready",
      "true",
    );
    const arena = await page.locator(".arena").boundingBox();
    expect(arena).not.toBeNull();
    expect(arena!.width).toBeCloseTo(size.width, 0);
    expect(arena!.height).toBeCloseTo(size.height, 0);
    const positions = await page.locator(".fighter").evaluateAll(
      (elements, asset) =>
        elements.map((el) => {
          const r = el.getBoundingClientRect();
          const sy = r.height / asset.sourceSize.height;
          return {
            top: r.y + asset.visibleBounds.top * sy,
            bottom: r.y + asset.visibleBounds.bottom * sy,
            left: r.x,
            right: r.right,
            visibleHeight:
              (asset.visibleBounds.bottom - asset.visibleBounds.top) * sy,
          };
        }),
      visualFighter,
    );
    const scale = size.width / visualStage.width;
    for (const position of positions) {
      expect(position.visibleHeight).toBeCloseTo(420 * scale, 0);
      expect(position.bottom).toBeCloseTo(visualStage.groundY * scale, 0);
      expect(position.left).toBeGreaterThan(0);
      expect(position.right).toBeLessThan(size.width);
      expect(position.top).toBeGreaterThan(165 * scale);
    }
    expect(positions[0].right).toBeLessThan(positions[1].left);
    await expect(page.locator(".fighter-two")).toHaveCSS(
      "transform",
      "matrix(-1, 0, 0, 1, 0, 0)",
    );
    await expect(page.getByText("SIN COMBATE", { exact: true })).toBeVisible();
    await page.screenshot({ path: `docs/visual-v1/arena-${size.width}.png` });
    expect(errors).toEqual([]);
    expect(missing).toEqual([]);
  });
}

test("sprite con alfa real, márgenes completos y dimensiones registradas", async ({
  page,
}) => {
  await page.goto("/visual-preview.html");
  await expect(page.locator("#visual-app")).toHaveAttribute(
    "data-ready",
    "true",
  );
  const result = await page
    .locator<HTMLImageElement>(".fighter-one")
    .evaluate((img) => {
      const c = document.createElement("canvas");
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      const ctx = c.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      const rgba = ctx.getImageData(0, 0, c.width, c.height).data;
      let left = c.width,
        top = c.height,
        right = 0,
        bottom = 0,
        transparent = 0,
        solid = 0;
      for (let y = 0; y < c.height; y++)
        for (let x = 0; x < c.width; x++) {
          const a = rgba[(y * c.width + x) * 4 + 3];
          if (a === 0) transparent++;
          if (a > 128) {
            solid++;
            left = Math.min(left, x);
            right = Math.max(right, x);
            top = Math.min(top, y);
            bottom = Math.max(bottom, y);
          }
        }
      return {
        width: c.width,
        height: c.height,
        bounds: { left, top, right: right + 1, bottom: bottom + 1 },
        transparent,
        solid,
      };
    });
  expect(result.width).toBe(visualFighter.sourceSize.width);
  expect(result.height).toBe(visualFighter.sourceSize.height);
  expect(result.bounds).toEqual(visualFighter.visibleBounds);
  expect(result.transparent).toBeGreaterThan(
    result.width * result.height * 0.5,
  );
  expect(result.solid).toBeGreaterThan(400000);
  expect(result.bounds.left).toBeGreaterThan(0);
  expect(result.bounds.top).toBeGreaterThan(0);
  expect(result.bounds.bottom).toBeLessThan(result.height);
});

test("retrato, comparación, menú y pantalla completa accesibles", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/visual-preview.html");
  await expect(page.locator("#visual-app")).toHaveAttribute(
    "data-ready",
    "true",
  );
  await page.getByRole("button", { name: "01 RETRATO" }).click();
  await expect(
    page.getByRole("dialog", { name: "LA IDENTIDAD ESTÁ EN LOS DETALLES." }),
  ).toBeVisible();
  await page.screenshot({ path: "docs/visual-v1/portrait-view.png" });
  await page.keyboard.press("Escape");
  await expect(page.locator("#portrait-dialog")).not.toBeVisible();
  await expect(page.locator('[data-dialog="portrait"]')).toBeFocused();
  await page.getByRole("button", { name: "02 COMPARAR REFERENCIA" }).click();
  await expect(page.locator("#compare-dialog img")).toHaveCount(3);
  await page.screenshot({ path: "docs/visual-v1/comparison.png" });
  await page.getByRole("button", { name: "Cerrar comparación" }).click();
  await page
    .getByRole("button", { name: "MENÚ", exact: false })
    .first()
    .click();
  await expect(page.locator("#menu-dialog")).toBeVisible();
  await page.getByRole("button", { name: "EXPLORAR PERSONAJE" }).click();
  await expect(page.locator("#menu-dialog")).not.toBeVisible();
  await expect(page.locator("#portrait-dialog")).toBeVisible();
  await page.getByRole("button", { name: "Cerrar retrato" }).click();
  await page
    .getByRole("button", { name: "Pantalla completa", exact: true })
    .click();
  await expect(page.locator("#fullscreen")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  expect(await page.evaluate(() => !!document.fullscreenElement)).toBe(true);
  await page
    .getByRole("button", { name: "Salir de pantalla completa", exact: true })
    .click();
  await expect(page.locator("#fullscreen")).toHaveAttribute(
    "aria-pressed",
    "false",
  );
});

test("el juego enlaza a la referencia visual", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "NUEVO ESTILO VISUAL" }).click();
  await expect(page).toHaveURL(/visual-preview.html/);
  await expect(page.locator("#visual-app")).toHaveAttribute(
    "data-ready",
    "true",
  );
  await page.getByRole("link", { name: "Volver al juego" }).click();
  await expect(
    page.getByRole("button", { name: "JUGAR VERSUS" }),
  ).toBeVisible();
});
