// P07 headless adapter. Uses the same Chromium/esbuild approach and shared diagnostics as P06.
import { chromium } from "playwright";
import { build } from "esbuild";
import { repositoryRoot } from "./legacy-import-common.mjs";

export async function reconstructLegacyGrabs(sourceBytes, regions) {
  const compiled = await build({
    stdin: {
      contents:
        'import { reconstructLegacyGrabs } from "./docs/characters/laura/legacy-grab-core.mjs"; window.reconstructLegacyGrabs = reconstructLegacyGrabs;',
      resolveDir: repositoryRoot,
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
      ([dataUrl, regions]) => window.reconstructLegacyGrabs(dataUrl, regions),
      [`data:image/png;base64,${sourceBytes.toString("base64")}`, regions],
    );
  } finally {
    await browser.close();
  }
}
