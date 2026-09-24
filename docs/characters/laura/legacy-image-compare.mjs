// Shared P06/P07 pixel diagnostics. Both images are decoded to the same RGBA dimensions.
import { measureAlpha } from "../geometry-contract.ts";

export function compareLegacyRgba(reconstructed, production, width, height) {
  if (
    reconstructed.length !== width * height * 4 ||
    production.length !== reconstructed.length
  )
    throw new RangeError("Legacy RGBA dimensions disagree");
  let rgbaPixelDifferences = 0;
  let rgbaChannelDifferences = 0;
  let alphaPixelDifferences = 0;
  for (let pixel = 0; pixel < width * height; pixel++) {
    let differs = false;
    for (let channel = 0; channel < 4; channel++) {
      if (
        reconstructed[pixel * 4 + channel] === production[pixel * 4 + channel]
      )
        continue;
      rgbaChannelDifferences++;
      differs = true;
      if (channel === 3) alphaPixelDifferences++;
    }
    if (differs) rgbaPixelDifferences++;
  }
  return {
    rgbaPixelDifferences,
    rgbaChannelDifferences,
    alphaPixelDifferences,
    reconstructedAlpha: measureAlpha(reconstructed, width, height),
    productionAlpha: measureAlpha(production, width, height),
  };
}
