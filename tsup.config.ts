import { readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { defineConfig } from "tsup";

// Bundled code keeps its licenses: write every bundled package's license text
// to dist/THIRD-PARTY-LICENSES.txt, read from the packages esbuild pulled in.
function writeThirdPartyLicenses() {
  const metafilePath = "dist/metafile-esm.json";
  const { inputs } = JSON.parse(readFileSync(metafilePath, "utf8"));
  rmSync(metafilePath);

  const packageDirs = new Set<string>();
  for (const input of Object.keys(inputs)) {
    const match = input.match(/^(.*node_modules\/(?:@[^/]+\/)?[^/]+)\//);
    if (match) packageDirs.add(match[1]);
  }

  const sections = [...packageDirs]
    .map((dir) => {
      const pkg = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
      const licenseFile = readdirSync(dir).find((file) => /^(licen[cs]e|copying)/i.test(file));
      const text = licenseFile
        ? readFileSync(join(dir, licenseFile), "utf8").trim()
        : `License: ${pkg.license}`;
      return { name: `${pkg.name}@${pkg.version}`, text };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  const header =
    "twd-lint bundles the packages below into dist. Their licenses follow.\n";
  const body = sections.map(({ name, text }) => `${"-".repeat(72)}\n${name}\n\n${text}\n`);
  writeFileSync("dist/THIRD-PARTY-LICENSES.txt", [header, ...body].join("\n"));
}

export default defineConfig({
  entry: {
    index: "src/index.ts", // the ESLint plugin
    cli: "src/cli/index.ts", // the twd-lint command
  },
  format: ["esm"],
  platform: "node",
  dts: { entry: { index: "src/index.ts" } },
  clean: true,
  // The parser and its TypeScript ship inside dist. typescript-eslint loads
  // whatever `typescript` the user's project has, and refuses TypeScript 7
  // (it has no JS API yet). Our rules only need the syntax tree, so our own
  // TypeScript 6 parses the files whatever version the project uses.
  // Temporary: .github/workflows/typescript-7-watch.yml fails once
  // typescript-eslint supports TypeScript 7, and lists what to remove.
  noExternal: [/^@typescript-eslint\//, "typescript", "ts-api-utils"],
  metafile: true,
  onSuccess: async () => writeThirdPartyLicenses(),
  // Those packages are CommonJS: give the ESM bundle what they expect to find.
  banner: {
    js: [
      "import { createRequire as __twdCreateRequire } from 'node:module';",
      "import { fileURLToPath as __twdFileURLToPath } from 'node:url';",
      "import { dirname as __twdDirname } from 'node:path';",
      "const require = __twdCreateRequire(import.meta.url);",
      "const __filename = __twdFileURLToPath(import.meta.url);",
      "const __dirname = __twdDirname(__filename);",
    ].join("\n"),
  },
});
