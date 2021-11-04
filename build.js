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

  console.log("Building contracts...");

  // build contracts
  await build({
    entryPoints: contractEntries.map((entry) => `./src/${entry}`),
    outdir: "./dist",
    format: "esm",
    bundle: true
  });

  console.log("Building tests...");

  // build tests
  await build({
    entryPoints: testEntries.map((entry) => `./__tests__/${entry}`),
    outdir: "./dist/tests",
    format: "cjs"
  });

  console.log("Getting license...");

  // read license
  let license = fs.readFileSync("./LICENSE").toString();
  const lines = license.split("\n");

  // make license a comment
  for (let i = 0; i < lines.length; i++) {
    lines[i] = " * " + lines[i];
  }

  license = "/*\n * \n" + lines.join("\n") + "\n * \n */\n\n";

  console.log("Appending license and fixing exports...");

  for (const entry of contractEntries) {
    const filename = `./dist/${entry.replace(/\.ts$/, ".js")}`;
    let src = fs.readFileSync(filename).toString();

    src = src.replace("async function handle", "export async function handle");
    src = src.replace("export {\n  handle\n};\n", "");
    src = license + src;
    fs.writeFileSync(filename, src);
  }
})();
