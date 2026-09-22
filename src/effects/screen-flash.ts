import type { ImpactLevel } from "./impact-level";

export interface ScreenFlashConfig {
  opacity: number;
  duration: number;
}

export const SCREEN_FLASH_CONFIG: Record<ImpactLevel, ScreenFlashConfig> = {
  light: { opacity: 0.035, duration: 45 },
  medium: { opacity: 0.07, duration: 60 },
  heavy: { opacity: 0.12, duration: 80 },
};
