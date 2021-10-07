const { build } = require("esbuild");
const fs = require("fs");

(async () => {
  const contractEntries = fs
    .readdirSync("./src", { withFileTypes: true })
    .filter((el) => el.isDirectory())
    .map((el) => `${el.name}/index.ts`);

  const testEntries = fs
    .readdirSync("./__tests__", { withFileTypes: true })
    .filter((el) => !el.isDirectory())
    .map(({ name }) => name);

  // build contracts
  await build({
    entryPoints: contractEntries.map((entry) => `./src/${entry}`),
    outdir: "./dist",
    format: "esm",
    bundle: true,
  });

  // build tests
  await build({
    entryPoints: testEntries.map((entry) => `./__tests__/${entry}`),
    outdir: "./dist/tests",
    format: "cjs",
  });

  for (const entry of contractEntries) {
    const filename = `./dist/${entry.replace(/\.ts$/, ".js")}`;
    let src = fs.readFileSync(filename).toString();

    src = src.replace("async function handle", "export async function handle");
    src = src.replace("export {\n  handle\n};\n", "");
    fs.writeFileSync(filename, src);
  }
})();
