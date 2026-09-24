// P06 input and reconstruction invariants. No production writes.
export const baseIds = Array.from(
  { length: 24 },
  (_, i) => `base_${String(i + 1).padStart(2, "0")}`,
);

export function validateLegacyCrops(crops, inventory, hashes) {
  const errors = [];
  const source = inventory.files.find((file) => file.path === crops.sourcePath);
  if (!source || source.role !== "base source" || source.character !== "laura")
    errors.push("P01 Laura base source missing");
  else {
    if (crops.sourceSha256 !== source.sha256 || hashes.source !== source.sha256)
      errors.push("P01 Laura source SHA-256 mismatch");
    if (
      crops.sourceSize.width !== source.width ||
      crops.sourceSize.height !== source.height
    )
      errors.push("P01 Laura source dimensions mismatch");
  }
  const atlas = inventory.files.find(
    (file) => file.path === "public/art/characters/laura/atlas.png",
  );
  if (!atlas || hashes.atlas !== atlas.sha256)
    errors.push("P01 production atlas SHA-256 mismatch");
  if (crops.schemaVersion !== 1) errors.push("Unsupported legacy crop version");
  if (
    crops.legacyFrame.width !== 300 ||
    crops.legacyFrame.height !== 320 ||
    crops.legacyFrame.columns !== 6 ||
    crops.legacyFrame.rows !== 4 ||
    crops.legacyFrame.historicalAnchor.x !== 150 ||
    crops.legacyFrame.historicalAnchor.y !== 310
  )
    errors.push("Historical legacy frame changed");
  if (!Array.isArray(crops.cropBoxes) || crops.cropBoxes.length !== 24)
    errors.push("Exactly 24 base crops are required");
  else
    for (let i = 0; i < crops.cropBoxes.length; i++) {
      const box = crops.cropBoxes[i];
      if (
        !Array.isArray(box) ||
        box.length !== 4 ||
        !box.every(Number.isInteger) ||
        box[0] < 0 ||
        box[1] < 0 ||
        box[2] > crops.sourceSize.width ||
        box[3] > crops.sourceSize.height ||
        box[0] >= box[2] ||
        box[1] >= box[3]
      )
        errors.push(`Invalid/out-of-source crop for ${baseIds[i]}`);
    }
  return errors;
}

export function validateLegacyManifest(manifest, crops) {
  const errors = [];
  if (!Array.isArray(manifest.resources) || manifest.resources.length !== 24)
    return ["Manifest must contain exactly 24 base resources"];
  const ids = manifest.resources.map((resource) => resource.resourceId);
  if (new Set(ids).size !== ids.length) errors.push("Duplicate resource IDs");
  if (ids.join(",") !== baseIds.join(","))
    errors.push("Expected base_01 through base_24 only");
  if (ids.some((id) => id.startsWith("grab_")))
    errors.push("P07 grab resource in P06 manifest");
  if (
    manifest.source.path !== crops.sourcePath ||
    manifest.source.sha256 !== crops.sourceSha256
  )
    errors.push("Manifest source does not match P01 crop contract");
  for (let i = 0; i < manifest.resources.length; i++) {
    const frame = manifest.resources[i];
    const [left, top, right, bottom] = crops.cropBoxes[i];
    if (
      JSON.stringify(frame.sourceRect) !==
      JSON.stringify({ left, top, right, bottom })
    )
      errors.push(`Crop mismatch ${frame.resourceId}`);
    if (
      frame.sourceToLegacy.uniformScale !== 1 ||
      frame.cutoutToLegacy.uniformScale !== 1
    )
      errors.push(`Accidental scaling ${frame.resourceId}`);
    if (
      frame.canonical.status !== "pending" ||
      frame.canonical.sourceTransform !== null
    )
      errors.push(`Unapproved canonical mapping ${frame.resourceId}`);
    if (frame.review.status !== "pending" || frame.status !== "draft")
      errors.push(`Unexpected approval ${frame.resourceId}`);
    const p = frame.legacyPlacement,
      b = frame.sourceAlphaBounds;
    if (
      p.x !== Math.round((300 - p.width) / 2) ||
      p.y !== 310 - p.height ||
      p.width !== b.right - b.left ||
      p.height !== b.bottom - b.top ||
      frame.sourceToLegacy.translation.x !== p.x - b.left ||
      frame.sourceToLegacy.translation.y !== p.y - b.top
    )
      errors.push(`Historical placement mismatch ${frame.resourceId}`);
  }
  return errors;
}
