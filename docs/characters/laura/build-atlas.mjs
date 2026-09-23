import { chromium } from "playwright";
import { readFile, writeFile } from "node:fs/promises";

const root = new URL("../../../public/art/characters/laura/", import.meta.url);
const source = await readFile(new URL("source-sheet.jpg", root));
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  const results = await page.evaluate(
    async (dataUrl) => {
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
      const boxes = [
        [18, 57, 199, 345],
        [222, 57, 394, 345],
        [417, 57, 588, 345],
        [609, 57, 780, 345],
        [806, 57, 982, 345],
        [998, 57, 1169, 345],
        [18, 378, 200, 651],
        [218, 437, 400, 651],
        [414, 445, 606, 651],
        [620, 450, 791, 651],
        [808, 389, 980, 651],
        [996, 385, 1169, 651],
        [17, 701, 189, 965],
        [186, 855, 452, 968],
        [438, 699, 607, 968],
        [615, 699, 808, 968],
        [813, 699, 981, 968],
        [984, 699, 1169, 968],
        [16, 1036, 218, 1280],
        [215, 1048, 457, 1280],
        [435, 991, 616, 1280],
        [615, 973, 793, 1223],
        [806, 994, 993, 1230],
        [981, 1047, 1169, 1280],
      ];
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
        if (winnerSize < 800)
          throw new Error(`Frame ${frame + 1} has no figure`);
        // Flood the exterior through non-ink pixels; enclosed white clothing stays opaque.
        const exterior = new Uint8Array(width * height);
        const queue = [];
        for (let i = 0; i < ink.length; i++) {
          if (labels[i] === winner) continue;
          const x = i % width;
          const y = Math.floor(i / width);
          if (x !== 0 && y !== 0 && x !== width - 1 && y !== height - 1)
            continue;
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
            if (
              neighbor < 0 ||
              exterior[neighbor] ||
              labels[neighbor] === winner
            )
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
          width: right - left,
          height: bottom - top,
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
      return {
        atlas: atlas.toDataURL("image/png").split(",")[1],
        portrait: portrait.toDataURL("image/png").split(",")[1],
        guard: guard.toDataURL("image/png").split(",")[1],
        measurements,
      };
    },
    `data:image/jpeg;base64,${source.toString("base64")}`,
  );
  for (const name of ["atlas", "portrait", "guard"])
    await writeFile(
      new URL(`${name}.png`, root),
      Buffer.from(results[name], "base64"),
    );
  console.log(results.measurements);
} finally {
  await browser.close();
}
