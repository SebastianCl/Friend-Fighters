// Shared headless entry point. No production path is written here.
import { chromium } from "playwright";
import { build } from "esbuild";
import { fileURLToPath } from "node:url";

export async function reconstructLegacyBase(
  sourceBytes,
  cropBoxes,
  productionAtlasBytes = null,
) {
  const compiled = await build({
    stdin: {
      contents:
        'import { reconstructLegacyBase } from "./docs/characters/laura/legacy-base-core.mjs"; window.reconstructLegacyBase = reconstructLegacyBase; import { compareLegacyAtlas } from "./docs/characters/laura/legacy-base-core.mjs"; window.compareLegacyAtlas = compareLegacyAtlas;',
      resolveDir: fileURLToPath(new URL("../../../", import.meta.url)),
      loader: "js",
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
    return await page.evaluate(
      async ([dataUrl, boxes, productionBase64]) => {
        const result = await window.reconstructLegacyBase(dataUrl, boxes);
        if (productionBase64 !== null)
          result.comparison = await window.compareLegacyAtlas(
            result.atlas,
            productionBase64,
          );
        return result;
      },
      [
        `data:image/jpeg;base64,${sourceBytes.toString("base64")}`,
        cropBoxes,
        productionAtlasBytes?.toString("base64") ?? null,
      ],
    );
  } finally {
    await browser.close();
  }
}
