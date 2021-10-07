import { JWKInterface } from "arweave/node/lib/wallet";
import { StateInterface } from "../src/clob/faces";
import { createContract, interactWrite, readContract } from "smartweave";
import { readFile } from "fs/promises";
import { join } from "path";
import ArLocal from "arlocal";
import Arweave from "arweave";

let arweave: Arweave;
let arlocal: ArLocal;
let port: number;

const COMMUNITY_CONTRACT = "t9T7DIOGxx4VWXoCEeYYarFYeERTpWIC1V3y-BPZgKE";
const EXAMPLE_TOKEN_PAIR = [
  "usjm4PCxUd5mtaon7zc97-dt-3qf67yPyqgzLnLqk5A",
  "-8A6RexFkpfWwuyVO98wzSFZh0d6VJuI-buTJvlwOJQ"
];

describe("Test the clob contract", () => {
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
    port = Math.round(Math.random() * 10000);
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
      await readFile(join(__dirname, "../clob/index.js"))
    );
    const initialState: StateInterface = {
      emergencyHaltWallet: wallet1.address,
      halted: true,
      protocolFeePercent: 5,
      pairGatekeeper: false,
      communityContract: undefined,
      pairs: [],
      invocations: [],
      foreignCalls: []
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

  it("should unhalt contract", async () => {
    await interactWrite(arweave, wallet1.jwk, CONTRACT_ID, {
      function: "halt"
    });
    await mine();

    expect((await state()).halted).toEqual(false);
  });

  it("should set community contract", async () => {
    await interactWrite(arweave, wallet1.jwk, CONTRACT_ID, {
      function: "setCommunityContract",
      id: COMMUNITY_CONTRACT
    });
    await mine();

    expect((await state()).communityContract).toEqual(COMMUNITY_CONTRACT);
  });
});

async function mine() {
  await arweave.api.get("mine");
}
