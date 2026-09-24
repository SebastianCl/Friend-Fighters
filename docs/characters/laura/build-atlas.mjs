// Historical production builder. P06 importer uses the same reconstruction function.
import { readFile, writeFile } from "node:fs/promises";
import { reconstructLegacyBase } from "./legacy-base-runner.mjs";

const crops = JSON.parse(
  await readFile(new URL("legacy-base-crops.json", import.meta.url), "utf8"),
);
const root = new URL("../../../public/art/characters/laura/", import.meta.url);
const source = await readFile(new URL("source-sheet.jpg", root));
const results = await reconstructLegacyBase(source, crops.cropBoxes);
for (const name of ["atlas", "portrait", "guard"])
  await writeFile(
    new URL(`${name}.png`, root),
    Buffer.from(results[name], "base64"),
  );
console.log(results.measurements);
