import { JWKInterface } from "arweave/node/lib/wallet";
import { StateInterface } from "../src/nft/faces";
import {
  createContract,
  interactRead,
  interactWrite,
  readContract
} from "smartweave";
import { readFile } from "fs/promises";
import { join } from "path";
import ArLocal from "arlocal";
import Arweave from "arweave";

let arweave: Arweave;
let arlocal: ArLocal;

const port = 1990;

describe("Test the NFT contract", () => {
  let CONTRACT_ID: string;
  let CONTRACT2_ID: string;
  let wallet1: {
    address: string;
    jwk: JWKInterface;
  } = { address: "", jwk: undefined };
  let wallet2: {
    address: string;
    jwk: JWKInterface;
  } = { address: "", jwk: undefined };

  async function state(): Promise<StateInterface> {
    return await readContract(arweave, CONTRACT_ID);
  }

  beforeAll(async () => {
    arlocal = new ArLocal(port, false);

    await arlocal.start();

    arweave = new Arweave({
      host: "localhost",
      port,
      protocol: "http"
    });

    wallet1.jwk = await arweave.wallets.generate();
    wallet2.jwk = await arweave.wallets.generate();
    wallet1.address = await arweave.wallets.getAddress(wallet1.jwk);
    wallet2.address = await arweave.wallets.getAddress(wallet2.jwk);

    const contractSrc = new TextDecoder().decode(
      await readFile(join(__dirname, "../nft/index.js"))
    );
    const initialState: StateInterface = {
      name: "Test",
      ticker: "TST",
      description: "Test NFT contract",
      title: "Some title",
      owner: wallet1.address,
      allowMinting: false,
      balances: {
        [wallet1.address]: 1
      },
      contentType: "image/png",
      createdAt: Math.floor(Date.now() / 1000).toString()
    };

    CONTRACT_ID = await createContract(
      arweave,
      wallet1.jwk,
      contractSrc,
      JSON.stringify(initialState)
    );
    CONTRACT2_ID = await createContract(
      arweave,
      wallet1.jwk,
      contractSrc,
      JSON.stringify({
        ...initialState,
        allowMinting: true
      })
    );

    await mine();
  });

  afterAll(async () => {
    await arlocal.stop();
  });

  it("should return balance for address", async () => {
    const balance = await interactRead(arweave, wallet1.jwk, CONTRACT_ID, {
      function: "balance"
    });
    await mine();

    expect(balance?.balance).toEqual(1);
  });

  it("should not allow minting new tokens", async () => {
    await interactWrite(arweave, wallet1.jwk, CONTRACT_ID, {
      function: "mint",
      target: wallet2.address
    });
    await mine();

    const contractState = await state();

    expect(contractState.balances[wallet2.address]).toEqual(undefined);
  });

  // allow minting with the 2nd contract, which has minting set to true
  it("should allow minting new tokens", async () => {
    await interactWrite(arweave, wallet1.jwk, CONTRACT2_ID, {
      function: "mint",
      target: wallet2.address
    });
    await mine();

    const contractState = await readContract(arweave, CONTRACT2_ID);

    expect(contractState.balances[wallet2.address]).toEqual(1);
  });

  it("should allow transferring", async () => {
    await interactWrite(arweave, wallet1.jwk, CONTRACT_ID, {
      function: "transfer",
      target: wallet2.address,
      qty: 1
    });
    await mine();

    const contractState = await state();

    expect(contractState.balances[wallet2.address]).toEqual(1);
    expect(contractState.balances[wallet1.address]).toEqual(0);
  });
});

async function mine() {
  await arweave.api.get("mine");
}
