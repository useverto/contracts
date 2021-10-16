import { JWKInterface } from "arweave/node/lib/wallet";
import { StateInterface } from "../src/invite/faces";
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

const port = 1989;

describe("Test the community contract", () => {
  let CONTRACT_ID: string;
  let wallet1: {
    address: string;
    jwk: JWKInterface;
  } = { address: "", jwk: undefined };
  let wallet2: {
    address: string;
    jwk: JWKInterface;
  } = { address: "", jwk: undefined };
  let wallet3: {
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
    wallet3.jwk = await arweave.wallets.generate();
    wallet1.address = await arweave.wallets.getAddress(wallet1.jwk);
    wallet2.address = await arweave.wallets.getAddress(wallet2.jwk);
    wallet3.address = await arweave.wallets.getAddress(wallet3.jwk);

    const contractSrc = new TextDecoder().decode(
      await readFile(join(__dirname, "../invite/index.js"))
    );
    const initialState: StateInterface = {
      name: "Verto Beta tester",
      ticker: "VBT",
      description: "A token for Verto beta testers",
      owner: wallet1.address,
      balances: {
        [wallet1.address]: 1
      },
      invites: {
        [wallet1.address]: 1
      }
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

  it("should return balance for address", async () => {
    const balance = await interactRead(arweave, wallet1.jwk, CONTRACT_ID, {
      function: "balance"
    });
    await mine();

    expect(balance?.balance).toEqual(1);
  });

  it("should allow inviting if the user has invites left", async () => {
    await interactWrite(arweave, wallet1.jwk, CONTRACT_ID, {
      function: "invite",
      target: wallet2.address
    });
    await mine();

    const contractState = await state();

    expect(contractState.balances[wallet2.address]).toEqual(1);
    expect(contractState.invites[wallet2.address]).toEqual(3);
    expect(contractState.invites[wallet1.address]).toEqual(0);
  });

  it("should not allow inviting if the user is out of invites", async () => {
    await interactWrite(arweave, wallet1.jwk, CONTRACT_ID, {
      function: "invite",
      target: wallet3.address
    });
    await mine();

    const contractState = await state();

    expect(contractState.invites[wallet1.address]).toEqual(0);
    expect(contractState.balances[wallet3.address]).toEqual(undefined);
  });

  it("should allow minting new tokens", async () => {
    await interactWrite(arweave, wallet1.jwk, CONTRACT_ID, {
      function: "mint",
      target: wallet3.address
    });
    await mine();

    const contractState = await state();

    expect(contractState.balances[wallet3.address]).toEqual(1);
    expect(contractState.invites[wallet3.address]).toEqual(3);
  });

  it("should allow transferring", async () => {
    await interactWrite(arweave, wallet1.jwk, CONTRACT_ID, {
      function: "transfer",
      target: wallet3.address,
      qty: 1
    });
    await mine();

    const contractState = await state();

    expect(contractState.balances[wallet3.address]).toEqual(2);
    expect(contractState.balances[wallet1.address]).toEqual(0);
  });
});

async function mine() {
  await arweave.api.get("mine");
}
