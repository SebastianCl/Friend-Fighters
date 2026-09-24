// Read-only P04 diagnostics for existing Laura runtime rectangles, including reserves.
// This is not an exporter or a canonical normalization/legacy-crop manifest (P05+).
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import { chromium } from "playwright";

const root = new URL("../../", import.meta.url);
const inventory = JSON.parse(
  await readFile(
    new URL("docs/characters/source-inventory.json", root),
    "utf8",
  ),
);
const map = JSON.parse(
  await readFile(
    new URL("docs/characters/laura/engine-map.json", root),
    "utf8",
  ),
);
const compiled = await build({
  stdin: {
    contents: `import { measureAlpha } from "./docs/characters/geometry-contract.ts";
      import { lauraRegions, visualFighter } from "./src/visual-assets.ts";
      window.geometryDiagnostics = { measureAlpha, lauraRegions, visualFighter };`,
    resolveDir: fileURLToPath(root),
    loader: "ts",
  },
  bundle: true,
  write: false,
  platform: "browser",
  format: "iife",
  logLevel: "silent",
});
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  await page.addScriptTag({ content: compiled.outputFiles[0].text });
  const sources = await page.evaluate(() => {
    const { visualFighter } = window.geometryDiagnostics;
    return [visualFighter.sheets.guard, visualFighter.sheets.grab];
  });
  const images = [];
  for (const url of sources) {
    const path = "public" + url;
    const bytes = await readFile(new URL(path, root));
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    const entry = inventory.files.find((file) => file.path === path);
    if (!entry || entry.sha256 !== sha256)
      throw new Error("P01 source mismatch: " + path);
    images.push({
      path,
      sha256,
      width: entry.width,
      height: entry.height,
      dataUrl: "data:image/png;base64," + bytes.toString("base64"),
    });
  }
  const diagnostics = await page.evaluate(
    async ({ images, resources }) => {
      const { measureAlpha, lauraRegions } = window.geometryDiagnostics;
      const decoded = [];
      for (const source of images) {
        const image = new Image();
        image.src = source.dataUrl;
        await image.decode();
        if (image.width !== source.width || image.height !== source.height)
          throw new Error("P01 dimension mismatch");
        const canvas = document.createElement("canvas");
        canvas.width = image.width;
        canvas.height = image.height;
        const context = canvas.getContext("2d", { willReadFrequently: true });
        context.drawImage(image, 0, 0);
        decoded.push({ source, context });
      }
      return resources.map((resource) => {
        const isBase = resource.category === "base";
        const index = Number(resource.id.split("_")[1]) - 1;
        // Current atlas layout only. P02 independently guards the 6x4 legacy mapping.
        const region = isBase
          ? {
              x: (index % 6) * 300,
              y: Math.floor(index / 6) * 320,
              width: 300,
              height: 320,
            }
          : lauraRegions.find(
              (region) => region.key === resource.engineKeys[0],
            );
        if (!region)
          throw new Error("Missing runtime rectangle: " + resource.id);
        if (isBase)
          for (const key of resource.engineKeys) {
            const actual = lauraRegions.find(
              (candidate) => candidate.key === key,
            );
            if (
              !actual ||
              ["x", "y", "width", "height"].some(
                (field) => actual[field] !== region[field],
              )
            )
              throw new Error("P02 rectangle mismatch: " + key);
          }
        const { source, context } = decoded[isBase ? 0 : 1];
        const { x, y, width, height } = region;
        if (
          x < 0 ||
          y < 0 ||
          x + width > source.width ||
          y + height > source.height
        )
          throw new Error("Rectangle outside source: " + resource.id);
        const rgba = context.getImageData(x, y, width, height).data;
        return {
          resourceId: resource.id,
          imagePath: source.path,
          sha256: source.sha256,
          coordinateSpace: "legacy-frame-pixels-top-left",
          alpha: measureAlpha(rgba, width, height),
        };
      });
    },
    { images, resources: map.resources },
  );
  console.log(
    JSON.stringify(
      {
        schemaVersion: 1,
        meaning: "legacy-alpha-diagnostics-not-canonical-conformance",
        thresholdsExclusive: [0, 128],
        resources: diagnostics,
      },
      null,
      2,
    ),
  );
} finally {
  await browser.close();
}
