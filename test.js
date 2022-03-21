const { createContract } = require("smartweave");
const fs = require("fs");
const path = require("path");
const Arweave = require("arweave");

const wallet = JSON.parse(
  new TextDecoder().decode(
    fs.readFileSync(path.join(__dirname, "arweave.json"))
  )
);

(async () => {
  /*const state = {
    "data": "initial data",
    "lastCaller": "",
    "invocations": [],
    "foreignCalls": [{
      "function": "invoke",
      "foreignContract": "RQH3jrx9PpfLwvk4uKG_IFFVx21FoZnuRfDaJoDJ_mc",
      "invocation": { 
        "function": "updateData",
        "data": "testtttttt"
      } 
    }]
  };
  const src = new TextDecoder().decode(fs.readFileSync(path.join(__dirname, "dist/fcp/index.js")));*/
  const arweave = new Arweave({
    host: "arweave.net", // Hostname or IP address for a Arweave host
    port: 443, // Port
    protocol: "https" // Network protocol http or https
  });

  //console.log(await createContract(arweave, wallet, src, JSON.stringify(state)))
  const tx = await arweave.createTransaction(
    {
      data: "1234"
    },
    wallet
  );

  tx.addTag("App-Name", "SmartWeaveAction");
  tx.addTag("App-Version", "0.3.0");
  tx.addTag(
    "Input",
    JSON.stringify({
      function: "readOutbox",
      contract: "RQH3jrx9PpfLwvk4uKG_IFFVx21FoZnuRfDaJoDJ_mc"
    })
  );
  tx.addTag("Contract", "RTxCiarZYSo7F_KnaPaypUyVhZLXSSGRpCcM37lbIhg");

  await arweave.transactions.sign(tx, wallet);

  let uploader = await arweave.transactions.getUploader(tx);

  while (!uploader.isComplete) {
    await uploader.uploadChunk();
    console.log(
      `${uploader.pctComplete}% complete, ${uploader.uploadedChunks}/${uploader.totalChunks}`
    );
  }

  console.log(tx.id);
})();
