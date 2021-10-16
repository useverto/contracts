import { JWKInterface } from "arweave/node/lib/wallet";
import { StateInterface } from "../src/community/faces";
import { createContract, interactWrite, readContract } from "smartweave";
import { readFile } from "fs/promises";
import { join } from "path";
import ArLocal from "arlocal";
import Arweave from "arweave";

let arweave: Arweave;
let arlocal: ArLocal;

const port = 1988;
const test_username = "test_username";
const test_token_id = "usjm4PCxUd5mtaon7zc97-dt-3qf67yPyqgzLnLqk5A";

describe("Test the community contract", () => {
  let CONTRACT_ID: string;
  let wallet: {
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

    wallet.jwk = await arweave.wallets.generate();
    wallet.address = await arweave.wallets.getAddress(wallet.jwk);

    const contractSrc = new TextDecoder().decode(
      await readFile(join(__dirname, "../community/index.js"))
    );
    const initialState: StateInterface = {
      people: [],
      tokens: []
    };

    CONTRACT_ID = await createContract(
      arweave,
      wallet.jwk,
      contractSrc,
      JSON.stringify(initialState)
    );

    await mine();
  });

  afterAll(async () => {
    await arlocal.stop();
  });

  it("should add a new Verto ID", async () => {
    await interactWrite(arweave, wallet.jwk, CONTRACT_ID, {
      function: "claim",
      username: test_username,
      name: "Test User",
      addresses: [wallet.address],
      image: undefined,
      bio: "",
      links: {}
    });
    await mine();

    const contractState = await state();
    const user = contractState.people.find(
      ({ username }) => username === test_username
    );

    expect(user).not.toEqual(undefined);
    expect(user.addresses).toContain(wallet.address);
  });

  it("should allow editing Verto ID", async () => {
    await interactWrite(arweave, wallet.jwk, CONTRACT_ID, {
      function: "claim",
      username: test_username,
      name: "Other Name",
      addresses: [wallet.address],
      image: undefined,
      bio: "",
      links: {}
    });
    await mine();

    const contractState = await state();
    const user = contractState.people.find(
      ({ username }) => username === test_username
    );

    expect(user.name).toEqual("Other Name");
  });

  it("should allow listing new tokens", async () => {
    await interactWrite(arweave, wallet.jwk, CONTRACT_ID, {
      function: "list",
      id: test_token_id,
      type: "community"
    });
    await mine();

    const contractState = await state();
    const token = contractState.tokens.find(({ id }) => id === test_token_id);

    expect(token).not.toEqual(undefined);
    expect(token.type).toEqual("community");
    expect(token.lister).toEqual(test_username);
  });

  it("should allow unlisting tokens", async () => {
    await interactWrite(arweave, wallet.jwk, CONTRACT_ID, {
      function: "unlist",
      id: test_token_id
    });
    await mine();

    const contractState = await state();
    const token = contractState.tokens.find(({ id }) => id === test_token_id);

    expect(token).toEqual(undefined);
  });
});

async function mine() {
  await arweave.api.get("mine");
}
