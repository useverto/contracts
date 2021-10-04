import { JWKInterface } from "arweave/node/lib/wallet";
import { StateInterface } from "../src/clob/faces";
import fs from "fs";
import ArLocal from "arlocal";
import Arweave from "arweave";

let arweave: Arweave;
let arlocal: ArLocal;
let port: number;

describe("Test the clob contract", () => {
  let contractSrc: string;

  let wallet1: {
    address: String;
    jwk: JwkInterface;
  };
  let wallet2: {
    address: String;
    jwk: JwkInterface;
  };

  let initialState: StateInterface;

  beforeAll(async () => {
    port = Math.round(Math.random() * 10000);
    arlocal = new ArLocal(port, false);

    await arlocal.start();

    arweave = new Arweave({
      host: "localhost",
      port,
      protocol: "http",
    });

    wallet1.jwk = await arweave.wallets.generate();
    wallet2.jwk = await arweave.wallets.generate();
    wallet1.address = await arweave.wallets.getAddress(wallet1.jwk);
    wallet2.address = await arweave.wallets.getAddress(wallet2.jwk);
  });
});

async function mine() {
  await arweave.api.get("mine");
}
