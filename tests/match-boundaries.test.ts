import { resolve, sep } from "node:path";
import ts from "typescript";
import { expect, it } from "vitest";

it("compiles the application with ECMAScript alone and only domain dependencies", () => {
  const program = ts.createProgram(
    [resolve("src/application/match-session.ts")],
    {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      lib: ["lib.es2022.d.ts"],
      types: [],
      strict: true,
      skipLibCheck: true,
      noEmit: true,
    },
  );
  const diagnostics = ts.getPreEmitDiagnostics(program);
  expect(
    diagnostics.map((d) =>
      ts.flattenDiagnosticMessageText(d.messageText, "\n"),
    ),
  ).toEqual([]);

  // The pilot's domain lives in these two files, outside application/.
  // New domain modules must be explicitly admitted; presentation stays outside.
  const domain = new Set([
    resolve("src/combat.ts"),
    resolve("src/combat-state.ts"),
  ]);
  const application = resolve("src/application") + sep;
  const dependencies = program
    .getSourceFiles()
    .filter((file) => !file.isDeclarationFile);
  for (const file of dependencies) {
    const path = resolve(file.fileName);
    expect(path.startsWith(application) || domain.has(path), path).toBe(true);
  }
});
