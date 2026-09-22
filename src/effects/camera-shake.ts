import type { Hit } from "../combat";

export type CameraShakeLevel = "light" | "medium" | "heavy";

export interface CameraShakeConfig {
  intensity: number;
  duration: number;
}

export const CAMERA_SHAKE_CONFIG: Record<CameraShakeLevel, CameraShakeConfig> =
  {
    light: { intensity: 0.001, duration: 50 },
    medium: { intensity: 0.0025, duration: 75 },
    heavy: { intensity: 0.004, duration: 110 },
  };

export function cameraShakeForHit(
  hit: Pick<Hit, "attackKind" | "blocked">,
): CameraShakeConfig | null {
  if (hit.blocked) return null;

  const level: CameraShakeLevel =
    hit.attackKind === "special"
      ? "heavy"
      : hit.attackKind === "kick"
        ? "medium"
        : "light";

  return CAMERA_SHAKE_CONFIG[level];
}
