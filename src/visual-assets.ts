/** Visual-only contract. Coordinates are source pixels, independent of combat units. */
export interface VisualCharacterAsset {
  id: string;
  name: string;
  sprite: string;
  portrait: string;
  sourceSize: { width: number; height: number };
  visibleBounds: { left: number; top: number; right: number; bottom: number };
  /** Ground anchor in the untrimmed texture. Kept stable for future animation frames. */
  groundAnchor: { x: number; y: number };
  displayHeight: number;
  facing: "right" | "left";
}
export const visualFighter: VisualCharacterAsset = {
  id: "reference-fighter-01",
  name: "Luchadora 01",
  sprite: "/art/visual-v1/fighter-guard.png",
  portrait: "/art/visual-v1/fighter-portrait.png",
  sourceSize: { width: 1024, height: 1536 },
  visibleBounds: { left: 133, top: 84, right: 912, bottom: 1472 },
  groundAnchor: { x: 512, y: 1472 },
  displayHeight: 420,
  facing: "right",
};
export const visualStage = {
  id: "neon-street-01",
  name: "Distrito Neón",
  background: "/art/visual-v1/neon-street.png",
  reference: "/art/visual-v1/reference.jpg",
  width: 1280,
  height: 720,
  groundY: 612,
} as const;
