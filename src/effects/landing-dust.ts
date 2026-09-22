export const LANDING_DUST_CONFIG = {
  columns: 4,
  rows: 4,
  frameRate: 30,
  scale: 0.2,
  depth: 1,
  offsetX: 0,
  offsetY: 0,
};

export const LANDING_DUST_ANIMATION = "landing-dust-once";
export const LANDING_DUST_TYPE = "landing-dust";

export function landingDustDuration(frameRate = LANDING_DUST_CONFIG.frameRate) {
  return (
    (LANDING_DUST_CONFIG.columns * LANDING_DUST_CONFIG.rows * 1000) / frameRate
  );
}

export function landedThisStep(
  wasAirborne: boolean,
  currentY: number,
): boolean {
  return wasAirborne && currentY === 0;
}
