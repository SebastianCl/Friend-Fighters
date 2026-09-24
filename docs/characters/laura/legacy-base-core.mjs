// Browser-only legacy extraction. Shared by the production builder and P06 importer.
// This retains the historical threshold, connected components, flood fill and placement.
import { measureAlpha } from "../geometry-contract.ts";

export async function reconstructLegacyBase(dataUrl, boxes) {
  const image = new Image();
  image.src = dataUrl;
  await image.decode();
  const input = document.createElement("canvas");
  input.width = image.width;
  input.height = image.height;
  const inputContext = input.getContext("2d", { willReadFrequently: true });
  inputContext.drawImage(image, 0, 0);
  const sourcePixels = inputContext.getImageData(
    0,
    0,
    image.width,
    image.height,
  );

  // Tight source rectangles keep adjacent figures apart, including the long knockdown frame.
  const atlas = document.createElement("canvas");
  atlas.width = 1800;
  atlas.height = 1280;
  const atlasContext = atlas.getContext("2d");
  const measurements = [];
  for (let frame = 0; frame < boxes.length; frame++) {
    const [x0, y0, x1, y1] = boxes[frame];
    const width = x1 - x0;
    const height = y1 - y0;
    const pixels = new Uint8ClampedArray(width * height * 4);
    const ink = new Uint8Array(width * height);
    for (let y = 0; y < height; y++)
      for (let x = 0; x < width; x++) {
        const sourceIndex = ((y0 + y) * image.width + x0 + x) * 4;
        const index = y * width + x;
        for (let channel = 0; channel < 3; channel++)
          pixels[index * 4 + channel] =
            sourcePixels.data[sourceIndex + channel];
        ink[index] =
          Math.min(...pixels.slice(index * 4, index * 4 + 3)) < 232 ? 1 : 0;
      }
    // The printed frame number is disconnected from the figure. Keep the largest ink island.
    const labels = new Int32Array(width * height);
    let winner = 0;
    let winnerSize = 0;
    let nextLabel = 0;
    for (let start = 0; start < ink.length; start++) {
      if (!ink[start] || labels[start]) continue;
      const label = ++nextLabel;
      const queue = [start];
      labels[start] = label;
      for (let head = 0; head < queue.length; head++) {
        const current = queue[head];
        const x = current % width;
        const y = Math.floor(current / width);
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
            const neighbor = ny * width + nx;
            if (ink[neighbor] && !labels[neighbor]) {
              labels[neighbor] = label;
              queue.push(neighbor);
            }
          }
      }
      if (queue.length > winnerSize) {
        winner = label;
        winnerSize = queue.length;
      }
    }
    if (winnerSize < 800) throw new Error(`Frame ${frame + 1} has no figure`);
    // Flood the exterior through non-ink pixels; enclosed white clothing stays opaque.
    const exterior = new Uint8Array(width * height);
    const queue = [];
    for (let i = 0; i < ink.length; i++) {
      if (labels[i] === winner) continue;
      const x = i % width;
      const y = Math.floor(i / width);
      if (x !== 0 && y !== 0 && x !== width - 1 && y !== height - 1) continue;
      exterior[i] = 1;
      queue.push(i);
    }
    for (let head = 0; head < queue.length; head++) {
      const current = queue[head];
      const x = current % width;
      const y = Math.floor(current / width);
      for (const neighbor of [
        x > 0 ? current - 1 : -1,
        x < width - 1 ? current + 1 : -1,
        y > 0 ? current - width : -1,
        y < height - 1 ? current + width : -1,
      ]) {
        if (neighbor < 0 || exterior[neighbor] || labels[neighbor] === winner)
          continue;
        exterior[neighbor] = 1;
        queue.push(neighbor);
      }
    }
    let left = width,
      top = height,
      right = 0,
      bottom = 0;
    for (let i = 0; i < exterior.length; i++) {
      if (exterior[i]) continue;
      pixels[i * 4 + 3] = 255;
      const x = i % width;
      const y = Math.floor(i / width);
      left = Math.min(left, x);
      right = Math.max(right, x + 1);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y + 1);
    }
    const cutout = document.createElement("canvas");
    cutout.width = width;
    cutout.height = height;
    cutout
      .getContext("2d")
      .putImageData(new ImageData(pixels, width, height), 0, 0);
    const column = frame % 6;
    const row = Math.floor(frame / 6);
    const drawX = column * 300 + Math.round((300 - (right - left)) / 2);
    const drawY = row * 320 + 310 - (bottom - top);
    atlasContext.drawImage(
      cutout,
      left,
      top,
      right - left,
      bottom - top,
      drawX,
      drawY,
      right - left,
      bottom - top,
    );
    measurements.push({
      frame: frame + 1,
      ink: winnerSize,
      sourceCrop: { x: x0, y: y0, width, height },
      sourceAlphaBounds: {
        left: x0 + left,
        top: y0 + top,
        right: x0 + right,
        bottom: y0 + bottom,
      },
      legacyPlacement: {
        x: drawX - column * 300,
        y: drawY - row * 320,
        width: right - left,
        height: bottom - top,
      },
      legacyTranslation: {
        x: drawX - column * 300 - (x0 + left),
        y: drawY - row * 320 - (y0 + top),
      },
      scale: 1,
      column,
      row,
    });
  }
  const portrait = document.createElement("canvas");
  portrait.width = portrait.height = 320;
  const portraitContext = portrait.getContext("2d");
  portraitContext.drawImage(atlas, 65, 16, 175, 175, 0, 0, 320, 320);
  const guard = document.createElement("canvas");
  guard.width = 300;
  guard.height = 320;
  guard.getContext("2d").drawImage(atlas, 0, 0, 300, 320, 0, 0, 300, 320);
  const frames = measurements.map((measurement) => {
    const frameCanvas = document.createElement("canvas");
    frameCanvas.width = 300;
    frameCanvas.height = 320;
    const context = frameCanvas.getContext("2d", { willReadFrequently: true });
    context.drawImage(
      atlas,
      measurement.column * 300,
      measurement.row * 320,
      300,
      320,
      0,
      0,
      300,
      320,
    );
    const rgba = context.getImageData(0, 0, 300, 320).data;
    return {
      png: frameCanvas.toDataURL("image/png").split(",")[1],
      alpha: measureAlpha(rgba, 300, 320),
    };
  });
  return {
    frames,
    atlas: atlas.toDataURL("image/png").split(",")[1],
    portrait: portrait.toDataURL("image/png").split(",")[1],
    guard: guard.toDataURL("image/png").split(",")[1],
    measurements,
  };
}

export async function compareLegacyAtlas(
  reconstructedBase64,
  productionBase64,
) {
  async function decode(base64) {
    const image = new Image();
    image.src = `data:image/png;base64,${base64}`;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = image.width;
    canvas.height = image.height;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    context.drawImage(image, 0, 0);
    return { width: image.width, height: image.height, context };
  }
  const a = await decode(reconstructedBase64);
  const b = await decode(productionBase64);
  const dimensionsEqual = a.width === b.width && a.height === b.height;
  if (!dimensionsEqual)
    return {
      dimensionsEqual,
      reconstructed: { width: a.width, height: a.height },
      production: { width: b.width, height: b.height },
      frames: [],
    };
  const frames = [];
  for (let i = 0; i < 24; i++) {
    const x = (i % 6) * 300,
      y = Math.floor(i / 6) * 320;
    const left = a.context.getImageData(x, y, 300, 320).data;
    const right = b.context.getImageData(x, y, 300, 320).data;
    let rgbaChannelDifferences = 0,
      rgbaPixelDifferences = 0,
      alphaPixelDifferences = 0;
    for (let p = 0; p < 300 * 320; p++) {
      let differs = false;
      for (let c = 0; c < 4; c++)
        if (left[p * 4 + c] !== right[p * 4 + c]) {
          rgbaChannelDifferences++;
          differs = true;
          if (c === 3) alphaPixelDifferences++;
        }
      if (differs) rgbaPixelDifferences++;
    }
    frames.push({
      resourceId: `base_${String(i + 1).padStart(2, "0")}`,
      rgbaPixelDifferences,
      rgbaChannelDifferences,
      alphaPixelDifferences,
      reconstructedAlpha: measureAlpha(left, 300, 320),
      productionAlpha: measureAlpha(right, 300, 320),
    });
  }
  return {
    dimensionsEqual,
    reconstructed: { width: a.width, height: a.height },
    production: { width: b.width, height: b.height },
    frames,
  };
}
