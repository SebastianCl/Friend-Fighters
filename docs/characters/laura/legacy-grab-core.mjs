// Browser-only, lossless legacy grab region copy. No trim, cleanup, scale or pivot inference.
import { measureAlpha } from "../geometry-contract.ts";
import { compareLegacyRgba } from "./legacy-image-compare.mjs";

async function decodedPixels(dataUrl) {
  const image = new Image();
  image.src = dataUrl;
  await image.decode();
  const canvas = document.createElement("canvas");
  canvas.width = image.width;
  canvas.height = image.height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  context.drawImage(image, 0, 0);
  return { width: image.width, height: image.height, context };
}

export async function reconstructLegacyGrabs(sourceDataUrl, regions) {
  const source = await decodedPixels(sourceDataUrl);
  const frames = [];
  for (const region of regions) {
    const { x, y, width, height } = region.sourceRect;
    if (
      x < 0 ||
      y < 0 ||
      width <= 0 ||
      height <= 0 ||
      x + width > source.width ||
      y + height > source.height
    )
      throw new RangeError(`Region outside grab sheet: ${region.resourceId}`);
    const productionRgba = source.context.getImageData(
      x,
      y,
      width,
      height,
    ).data;
    const frame = document.createElement("canvas");
    frame.width = width;
    frame.height = height;
    frame
      .getContext("2d")
      .putImageData(
        new ImageData(new Uint8ClampedArray(productionRgba), width, height),
        0,
        0,
      );
    const png = frame.toDataURL("image/png").split(",")[1];
    const reconstructed = await decodedPixels(`data:image/png;base64,${png}`);
    const rebuiltRgba = reconstructed.context.getImageData(
      0,
      0,
      width,
      height,
    ).data;
    const comparison = compareLegacyRgba(
      rebuiltRgba,
      productionRgba,
      width,
      height,
    );
    let alpha1To128Count = 0,
      partialAlphaCount = 0;
    for (let pixel = 0; pixel < width * height; pixel++) {
      const alpha = rebuiltRgba[pixel * 4 + 3];
      if (alpha > 0 && alpha <= 128) alpha1To128Count++;
      if (alpha > 0 && alpha < 255) partialAlphaCount++;
    }
    frames.push({
      resourceId: region.resourceId,
      engineKey: region.engineKey,
      width,
      height,
      png,
      alpha: measureAlpha(rebuiltRgba, width, height),
      alpha1To128Count,
      partialAlphaCount,
      comparison: {
        ...comparison,
        dimensionsEqual:
          reconstructed.width === width && reconstructed.height === height,
        boundsEqual:
          JSON.stringify(comparison.reconstructedAlpha) ===
          JSON.stringify(comparison.productionAlpha),
        historicalPivotEqual:
          region.anchorX === Math.round(width / 2) &&
          comparison.reconstructedAlpha.gt128.bounds?.bottom ===
            comparison.productionAlpha.gt128.bounds?.bottom,
      },
    });
  }
  return {
    sourceDimensions: { width: source.width, height: source.height },
    frames,
  };
}
