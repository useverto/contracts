import { JWKInterface } from "arweave/node/lib/wallet";
import { StateInterface } from "../src/collection/faces";
import { createContract, interactWrite, readContract } from "smartweave";
import { readFile } from "fs/promises";
import { join } from "path";
import ArLocal from "arlocal";
import Arweave from "arweave";

let arweave: Arweave;
let arlocal: ArLocal;

const port = 1987;
const EXAMPLE_TOKEN_ID = "usjm4PCxUd5mtaon7zc97-dt-3qf67yPyqgzLnLqk5A";

describe("Test the collection contract", () => {
  let CONTRACT_ID: string;
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

    // add balances to test wallets
    await arweave.api.get(`/mint/${wallet1.address}/1000000000000`);
    await arweave.api.get(`/mint/${wallet2.address}/1000000000000`);

    const contractSrc = new TextDecoder().decode(
      await readFile(join(__dirname, "../collection/index.js"))
    );
    const initialState: StateInterface = {
      name: "Example Collection",
      description: "This is an example collection contract",
      owner: wallet1.address,
      collaborators: [wallet1.address],
      items: [EXAMPLE_TOKEN_ID]
    };

    CONTRACT_ID = await createContract(
      arweave,
      wallet1.jwk,
      contractSrc,
      JSON.stringify(initialState)
    );

    await mine();
  });

  afterAll(async () => {
    await arlocal.stop();
  });

  it("should update items", async () => {
    await interactWrite(arweave, wallet1.jwk, CONTRACT_ID, {
      function: "updateItems",
      items: []
    });
    await mine();

    expect((await state()).items).toHaveLength(0);
  });

  it("should update details", async () => {
    const newDetails = {
      name: "Different name",
      description: "Different description"
    };
    await interactWrite(arweave, wallet1.jwk, CONTRACT_ID, {
      function: "updateDetails",
      ...newDetails
    });
    await mine();

    expect((await state()).name).toEqual(newDetails.name);
    expect((await state()).description).toEqual(newDetails.description);
  });

  it("should update collaborators", async () => {
    await interactWrite(arweave, wallet1.jwk, CONTRACT_ID, {
      function: "updateCollaborators",
      collaborators: [wallet1.address, wallet2.address]
    });
    await mine();

    expect((await state()).collaborators).toContain(wallet1.address);
    expect((await state()).collaborators).toContain(wallet2.address);
  });
});

async function mine() {
  await arweave.api.get("mine");
}
