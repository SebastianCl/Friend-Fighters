import { test, expect, type Page } from "@playwright/test";

test("el menú abre el cuadro informativo del torneo y permite volver", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page.getByRole("button", { name: "VER TORNEO" }).click();
  await expect(page.locator(".tournament-selection-panel")).toBeVisible();
  expect(
    await page.locator("[data-tournament-character]").count(),
  ).toBeGreaterThanOrEqual(2);
  await page
    .getByRole("button", { name: "Elegir SEBASTIAN para PLAYER" })
    .click();
  await page.getByRole("button", { name: "CREAR TORNEO" }).click();

  const bracket = page.locator(".tournament-panel");
  await expect(bracket).toBeVisible();
  await expect(page.locator(".tournament-round")).toHaveCount(2);
  await expect(page.locator(".tournament-match")).toHaveCount(3);
  await expect(page.locator(".tournament-slot")).toHaveCount(6);
  await expect(bracket).toContainText("SEMIFINALES");
  await expect(bracket).toContainText("FINAL");
  await expect(bracket).toContainText("PLAYER");
  await expect(bracket).toContainText("SEBASTIAN");
  await expect(
    bracket.locator('.tournament-match[data-round="1"][data-match="1"]'),
  ).toContainText("PLAYER");
  await expect(
    bracket.locator('.tournament-match[data-round="1"][data-match="2"]'),
  ).toContainText("CPU 2");
  await expect(
    bracket.locator('.tournament-match[data-round="1"][data-match="2"]'),
  ).toContainText("CPU 3");
  await expect(page.locator(".tournament-champion")).toContainText(
    "POR DEFINIR",
  );
  await expect(page.locator("#hud")).toBeHidden();
  await page.screenshot({ path: "test-results/tournament.png" });
  await page.getByRole("button", { name: "VOLVER AL MENÚ" }).click();
  await expect(
    page.getByRole("button", { name: "JUGAR VERSUS" }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

async function winCurrentFight(page: Page) {
  const start = page.getByRole("button", { name: "PELEAR SIGUIENTE COMBATE" });
  await expect(start).toBeEnabled();
  await start.click();
  await expect(page.locator("#hud")).toBeVisible();

  for (let round = 0; round < 2; round++) {
    await page.keyboard.down("KeyD");
    await page.waitForTimeout(1600);
    for (let hit = 0; hit < 24; hit++) {
      if (
        (await page.locator(".result-panel").count()) ||
        (await page.locator(".tournament-panel").count()) ||
        (await page.locator(".round-message").count())
      ) {
        break;
      }
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
}

test("tres combates reales avanzan semifinales y final hasta el campeón", async ({
  page,
}) => {
  test.setTimeout(240000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page.getByRole("button", { name: "VER TORNEO" }).click();
  await page.getByRole("button", { name: "CREAR TORNEO" }).click();

  await winCurrentFight(page);
  await expect(page.locator(".result-panel")).toContainText("PLAYER");
  await page.getByRole("button", { name: "VER CUADRO ACTUALIZADO" }).click();
  await expect(
    page.locator('.tournament-match[data-round="1"][data-match="1"]'),
  ).toContainText("GANADOR");
  await expect(page.locator(".tournament-actions")).toContainText(
    "CPU 2 VS CPU 3",
  );

  await winCurrentFight(page);
  await expect(page.locator(".result-panel")).toContainText("CPU 2");
  await page.getByRole("button", { name: "VER CUADRO ACTUALIZADO" }).click();
  await expect(page.locator('.tournament-match[data-round="2"]')).toContainText(
    "PLAYER",
  );
  await expect(page.locator('.tournament-match[data-round="2"]')).toContainText(
    "CPU 2",
  );

  await winCurrentFight(page);
  await expect(page.locator(".tournament-champion")).toContainText(
    "PLAYER · LAURA",
  );
  await expect(page.locator('.tournament-match[data-round="2"]')).toContainText(
    "GANADOR",
  );
  await expect(page.locator("#tournament-start")).toHaveCount(0);
  await expect(page.locator(".tournament-match")).toHaveCount(3);
  expect(errors).toEqual([]);
});
