// P07 source/region and derived-manifest invariants, with P02 runtime mapping unchanged.
export const grabIds = ["grab_01", "grab_02", "grab_03"];
export const grabKeys = ["grab-reach", "grab-hold", "grab-throw"];

export function validateGrabRegions(
  config,
  inventory,
  actualHash,
  runtimeRegions,
  engineMap,
) {
  const errors = [];
  const source = inventory.files.find(
    (file) => file.path === config.sourcePath,
  );
  if (
    !source ||
    source.character !== "laura" ||
    source.role !== "grab source and runtime"
  )
    errors.push("P01 Laura grab source missing");
  else {
    if (config.sourceSha256 !== source.sha256 || actualHash !== source.sha256)
      errors.push("P01 Laura grab source SHA-256 mismatch");
    if (
      config.sourceSize.width !== source.width ||
      config.sourceSize.height !== source.height ||
      config.format !== source.format
    )
      errors.push("P01 Laura grab source dimensions/format mismatch");
  }
  if (config.schemaVersion !== 1)
    errors.push("Unsupported grab region version");
  if (!Array.isArray(config.regions) || config.regions.length !== 3)
    return [...errors, "Exactly three grab regions are required"];
  const ids = config.regions.map((region) => region.resourceId);
  if (new Set(ids).size !== 3) errors.push("Duplicate grab resource IDs");
  if (ids.join(",") !== grabIds.join(","))
    errors.push("Expected grab_01 through grab_03 only");
  for (let i = 0; i < 3; i++) {
    const region = config.regions[i];
    const rect = region.sourceRect;
    if (
      !rect ||
      ![rect.x, rect.y, rect.width, rect.height].every(Number.isInteger) ||
      rect.x < 0 ||
      rect.y < 0 ||
      rect.width <= 0 ||
      rect.height <= 0 ||
      rect.x + rect.width > config.sourceSize.width ||
      rect.y + rect.height > config.sourceSize.height
    )
      errors.push(`Invalid/out-of-source grab region ${region.resourceId}`);
    if (region.engineKey !== grabKeys[i])
      errors.push(`Wrong grab engine key ${region.resourceId}`);
    const current = runtimeRegions.find(
      (entry) => entry.key === region.engineKey,
    );
    if (
      !current ||
      current.sheet !== "grab" ||
      ["x", "y", "width", "height", "anchorX", "referenceHeight"].some(
        (field) =>
          current[field] !==
          (field === "anchorX" || field === "referenceHeight"
            ? region[field]
            : rect?.[field]),
      )
    )
      errors.push(`Runtime region drift ${region.resourceId}`);
    const mapping = engineMap.resources.find(
      (entry) => entry.id === region.resourceId,
    );
    if (
      !mapping ||
      mapping.category !== "grab" ||
      mapping.sourcePath !== config.sourcePath ||
      mapping.engineKeys.join(",") !== region.engineKey
    )
      errors.push(`P02 engine-map drift ${region.resourceId}`);
    if (
      i > 0 &&
      rect &&
      config.regions[i - 1].sourceRect.x +
        config.regions[i - 1].sourceRect.width !==
        rect.x
    )
      errors.push(`Unexpected gap/overlap before ${region.resourceId}`);
  }
  const end =
    config.regions[2].sourceRect.x + config.regions[2].sourceRect.width;
  if (config.regions[0].sourceRect.x !== 0 || end !== config.sourceSize.width)
    errors.push("Grab regions do not cover historical source width");
  return errors;
}

export function validateGrabManifest(manifest, config) {
  const errors = [];
  if (!Array.isArray(manifest.resources) || manifest.resources.length !== 3)
    return ["Manifest must contain exactly three grab resources"];
  const ids = manifest.resources.map((resource) => resource.resourceId);
  if (new Set(ids).size !== 3) errors.push("Duplicate grab resource IDs");
  if (ids.join(",") !== grabIds.join(","))
    errors.push("Expected grab_01 through grab_03 only");
  if (
    manifest.source.path !== config.sourcePath ||
    manifest.source.sha256 !== config.sourceSha256
  )
    errors.push("Grab manifest source differs from P01 region contract");
  for (let i = 0; i < 3; i++) {
    const resource = manifest.resources[i],
      region = config.regions[i],
      rect = region.sourceRect;
    if (JSON.stringify(resource.sourceRect) !== JSON.stringify(rect))
      errors.push(`Source rectangle mismatch ${resource.resourceId}`);
    if (
      resource.legacyFrame.width !== rect.width ||
      resource.legacyFrame.height !== rect.height
    )
      errors.push(`Legacy dimensions mismatch ${resource.resourceId}`);
    if (
      resource.sourceToLegacy.uniformScale !== 1 ||
      resource.sourceToLegacy.translation.x !== -rect.x ||
      resource.sourceToLegacy.translation.y !== -rect.y
    )
      errors.push(`Legacy transform/scaling mismatch ${resource.resourceId}`);
    if (
      resource.historicalPivot.x !== region.anchorX ||
      resource.historicalPivot.y !== resource.alpha.gt128.bounds?.bottom ||
      resource.historicalPivot.referenceHeight !== region.referenceHeight
    )
      errors.push(`Historical pivot mismatch ${resource.resourceId}`);
    if (
      resource.alpha.gt0.count < resource.alpha.gt128.count ||
      resource.alpha.gt0.count - resource.alpha.gt128.count !==
        resource.alpha1To128Count
    )
      errors.push(`Partial alpha diagnostic mismatch ${resource.resourceId}`);
    if (
      resource.partialAlphaCount < resource.alpha1To128Count ||
      resource.partialAlphaCount > resource.alpha.gt0.count
    )
      errors.push(`Invalid partial alpha count ${resource.resourceId}`);
    if (
      resource.canonical.status !== "pending" ||
      resource.canonical.sourceTransform !== null ||
      resource.status !== "draft" ||
      resource.review.status !== "pending"
    )
      errors.push(
        `Unapproved canonical/production status ${resource.resourceId}`,
      );
  }
  return errors;
}
