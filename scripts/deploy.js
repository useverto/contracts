const Arweave = require("arweave");
const { createContract } = require("smartweave");
const fs = require("fs");

const client = new Arweave({
  host: "arweave.net",
  port: 443,
  protocol: "https",
});

const contract = process.env.CONTRACT_NAME;

if (!contract) throw new Error("No contract name submitted");

const wallet = JSON.parse(fs.readFileSync("./arweave.json"));
const src = fs.readFileSync(`./dist/${contract}/index.js`);
const state = fs.readFileSync(`./src/${contract}/state.json`);

(async () => {
  const id = await createContract(client, wallet, src, state);
  console.log(id);
})();
