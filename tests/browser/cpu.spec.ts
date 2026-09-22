import { expect, test } from "@playwright/test";

test("Player vs CPU pelea, se pausa y conserva el modo en la revancha", async ({
  page,
}) => {
  test.setTimeout(120000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page.getByRole("button", { name: "JUGAR VERSUS" }).click();
  const control = page.locator("#opponent-control");
  await expect(control).toHaveValue("PLAYER");
  await control.selectOption("CPU");
  await expect(page.locator("#device-1")).toBeDisabled();
  await page.getByRole("button", { name: "¡A PELEAR!" }).click();
  await expect(page.locator("#mode-label")).toContainText("PLAYER VS CPU");
  await expect(page.locator(".player-1 .player-number")).toHaveText("CPU");
  await expect(page.locator(".player-0 .life-fill")).not.toHaveAttribute(
    "style",
    "width:100%",
    { timeout: 20000 },
  );
  await page.keyboard.press("Escape");
  await expect(page.locator(".pause-panel")).toBeVisible();
  const health = await page
    .locator(".player-0 .life-fill")
    .getAttribute("style");
  await page.waitForTimeout(500);
  await expect(page.locator(".player-0 .life-fill")).toHaveAttribute(
    "style",
    health!,
  );
  await page.getByRole("button", { name: "VOLVER AL COMBATE" }).click();
  await expect(page.locator(".result-panel")).toBeVisible({ timeout: 80000 });
  await expect(page.locator(".result-panel")).toContainText("CPU");
  await page.getByRole("button", { name: "OTRA RONDA ENTRE AMIGOS" }).click();
  await expect(page.locator(".player-1 .player-number")).toHaveText("CPU");
  await expect(page.locator(".timer")).toContainText("ROUND 1");
  expect(errors).toEqual([]);
});
