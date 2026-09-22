import { describe, expect, it } from "vitest";
import {
  CAMERA_SHAKE_CONFIG,
  cameraShakeForHit,
} from "../src/effects/camera-shake";

describe("configuración de Camera Shake", () => {
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
