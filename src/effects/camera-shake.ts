import type { Hit } from "../combat";
import { impactLevelForHit, type ImpactLevel } from "./impact-level";

export type CameraShakeLevel = ImpactLevel;

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
  const level = impactLevelForHit(hit);
  return level ? CAMERA_SHAKE_CONFIG[level] : null;
}
