import { describe, expect, it } from "vitest";
import {
  CAMERA_SHAKE_CONFIG,
  cameraShakeForHit,
} from "../src/effects/camera-shake";
import { impactLevelForHit } from "../src/effects/impact-level";
import { SCREEN_FLASH_CONFIG } from "../src/effects/screen-flash";

describe("configuración de Camera Shake", () => {
  it("comparte la clasificación de impactos con Screen Flash", () => {
    expect(impactLevelForHit({ attackKind: "punch", blocked: false })).toBe(
      "light",
    );
    expect(impactLevelForHit({ attackKind: "kick", blocked: false })).toBe(
      "medium",
    );
    expect(impactLevelForHit({ attackKind: "special", blocked: false })).toBe(
      "heavy",
    );
    expect(impactLevelForHit({ attackKind: "special", blocked: true })).toBe(
      null,
    );
    expect(SCREEN_FLASH_CONFIG).toEqual({
      light: { opacity: 0.035, duration: 45 },
      medium: { opacity: 0.07, duration: 60 },
      heavy: { opacity: 0.12, duration: 80 },
    });
  });

  it("asigna un nivel por tipo de ataque con intensidades y duraciones crecientes", () => {
    expect(cameraShakeForHit({ attackKind: "punch", blocked: false })).toEqual(
      CAMERA_SHAKE_CONFIG.light,
    );
    expect(cameraShakeForHit({ attackKind: "kick", blocked: false })).toEqual(
      CAMERA_SHAKE_CONFIG.medium,
    );
    expect(
      cameraShakeForHit({ attackKind: "special", blocked: false }),
    ).toEqual(CAMERA_SHAKE_CONFIG.heavy);

    expect(CAMERA_SHAKE_CONFIG.light).toEqual({
      intensity: 0.001,
      duration: 50,
    });
    expect(CAMERA_SHAKE_CONFIG.medium).toEqual({
      intensity: 0.0025,
      duration: 75,
    });
    expect(CAMERA_SHAKE_CONFIG.heavy).toEqual({
      intensity: 0.004,
      duration: 110,
    });
  });

  it("no solicita shake para un impacto bloqueado", () => {
    expect(
      cameraShakeForHit({ attackKind: "special", blocked: true }),
    ).toBeNull();
  });
});
