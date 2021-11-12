import { JWKInterface } from "arweave/node/lib/wallet";
import { ForeignCallInterface, StateInterface } from "../src/clob/faces";
import { StateInterface as CommunityContractStateInterface } from "../src/community/faces";
import {
  createContract,
  interactWrite,
  interactWriteDryRun,
  readContract
} from "smartweave";
import { readFile } from "fs/promises";
import { join } from "path";
import ArLocalUtils from "arlocal-utils";
import ArLocal from "arlocal";
import Arweave from "arweave";

let arweave: Arweave;
let arlocal: ArLocal;

const port = 1986;
const COMMUNITY_CONTRACT = "t9T7DIOGxx4VWXoCEeYYarFYeERTpWIC1V3y-BPZgKE";
const EXAMPLE_TOKEN_PAIR = [
  "usjm4PCxUd5mtaon7zc97-dt-3qf67yPyqgzLnLqk5A",
  "-8A6RexFkpfWwuyVO98wzSFZh0d6VJuI-buTJvlwOJQ"
];
const initialPSTBalance = 1000000;

jest.setTimeout(120000);

describe("Test the clob contract", () => {
  let wallet1: {
    address: string;
    jwk: JWKInterface;
  } = { address: "", jwk: undefined };
  let wallet2: {
    address: string;
    jwk: JWKInterface;
  } = { address: "", jwk: undefined };

  let CONTRACT_ID: string;
  let localCommunityContract: string;

  let localTokenPair: string[] = [];
  let localTokenPairTwo: string[] = [];

  async function state(): Promise<StateInterface> {
    await mine();
    return await readContract(arweave, CONTRACT_ID);
  }

  async function createOrder(
    {
      qty,
      token,
      price,
      tokenPair
    }: {
      qty: number;
      token: string;
      price?: number;
      tokenPair: string[];
    },
    wallet: JWKInterface
  ) {
    const transaction = await interactWrite(arweave, wallet, token, {
      function: "transfer",
      qty,
      target: CONTRACT_ID
    });
    await mine();

    const orderID = await interactWrite(arweave, wallet, CONTRACT_ID, {
      function: "createOrder",
      transaction,
      pair: tokenPair,
      price
    });
    await mine();

    return orderID;
  }

  async function findOrder(orderID: string, tokenPair: string[]) {
    const contractState = await state();
    const onContractPair = contractState.pairs.find(
      ({ pair }) => pair[0] === tokenPair[0] && pair[1] === tokenPair[1]
    );
    const order = onContractPair?.orders.find(({ id: tx }) => tx === orderID);

    return order;
  }

  beforeAll(async () => {
    // init arlocal
    arlocal = new ArLocal(port, false);

    await arlocal.start();

    arweave = new Arweave({
      host: "localhost",
      port,
      protocol: "http"
      // logging: true
    });

    // generate test wallets
    wallet1.jwk = await arweave.wallets.generate();
    wallet2.jwk = await arweave.wallets.generate();
    wallet1.address = await arweave.wallets.getAddress(wallet1.jwk);
    wallet2.address = await arweave.wallets.getAddress(wallet2.jwk);

    // deploy contract locally
    const contractSrc = new TextDecoder().decode(
      await readFile(join(__dirname, "../clob/index.js"))
    );
    const initialState: StateInterface = {
      emergencyHaltWallet: wallet1.address,
      halted: false,
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

    // copy testing contracts from mainnet
    const arlocalUtils = new ArLocalUtils(arweave, wallet1.jwk);

    // copy 2 PSTs for testing
    for (const pstID of EXAMPLE_TOKEN_PAIR) {
      const copyToken = async () =>
        await arlocalUtils.copyContract(pstID, false, (state) => {
          // add some balance to the test wallets
          state.balances[wallet1.address] = initialPSTBalance;
          state.balances[wallet2.address] = initialPSTBalance;

          return state;
        });
      localTokenPair.push(await copyToken());
      localTokenPairTwo.push(await copyToken());
    }

    // copy the community contract
    localCommunityContract = await arlocalUtils.copyContract(
      COMMUNITY_CONTRACT,
      false,
      (state: CommunityContractStateInterface) => {
        // add testing wallets to initial state
        state.people.push(
          {
            username: "test_" + wallet1.address.slice(0, 5),
            name: "Test User",
            addresses: [wallet1.address],
            image: "",
            bio: "",
            links: {}
          },
          {
            username: "test_" + wallet2.address.slice(0, 5),
            name: "Test User2",
            addresses: [wallet2.address],
            image: "",
            bio: "",
            links: {}
          }
        );

        // push testing PSTs
        for (const id of [...localTokenPair, ...localTokenPairTwo])
          state.tokens.push({
            id,
            type: "community",
            lister: "test_" + wallet1.address.slice(0, 5)
          });

        return state;
      }
    );

    await mine();
  });

  afterAll(async () => {
    await arlocal.stop();
  });

  it("should set community contract", async () => {
    await interactWrite(arweave, wallet1.jwk, CONTRACT_ID, {
      function: "setCommunityContract",
      id: localCommunityContract
    });
    await mine();

    expect((await state()).communityContract).toEqual(localCommunityContract);
  });

  it("should halt contract", async () => {
    // halt
    await interactWrite(arweave, wallet1.jwk, CONTRACT_ID, {
      function: "halt"
    });
    await mine();

    // test if the halt blocker works
    // this should fail
    const { type } = await interactWriteDryRun(
      arweave,
      wallet1.jwk,
      CONTRACT_ID,
      {
        function: "setCommunityContract",
        id: COMMUNITY_CONTRACT
      }
    );
    expect(type).toEqual("error");

    // unhalt
    await interactWrite(arweave, wallet1.jwk, CONTRACT_ID, {
      function: "halt"
    });
    await mine();

    expect((await state()).halted).toEqual(false);
  });

  it("should not allow halting for other wallets", async () => {
    await interactWrite(arweave, wallet2.jwk, CONTRACT_ID, {
      function: "halt"
    });
    await mine();

    const contractState = await state();

    expect(contractState.halted).toEqual(false);
  });

  it("should not allow updating the community contracts for other wallets", async () => {
    await interactWrite(arweave, wallet2.jwk, CONTRACT_ID, {
      function: "setCommunityContract",
      id: COMMUNITY_CONTRACT
    });
    await mine();

    const contractState = await state();

    expect(contractState.communityContract).toEqual(localCommunityContract);
  });

  it("should add a new pair", async () => {
    await interactWrite(arweave, wallet1.jwk, CONTRACT_ID, {
      function: "addPair",
      pair: localTokenPair
    });
    // add the second token pair
    await interactWrite(arweave, wallet1.jwk, CONTRACT_ID, {
      function: "addPair",
      pair: localTokenPairTwo
    });
    await mine();

    const contractState = await state();
    const onContractPair = contractState.pairs.find(
      ({ pair }) =>
        pair[0] === localTokenPair[0] && pair[1] === localTokenPair[1]
    );

    expect(onContractPair).not.toEqual(undefined);
  });

  // two orders match cleanly (same price & same amount)
  it("should match two orders cleanly", async () => {
    const qtyToTrade = 1000;

    // create first order
    const orderSendID = await createOrder(
      {
        qty: qtyToTrade,
        token: localTokenPair[0],
        price: 1,
        tokenPair: localTokenPair
      },
      wallet1.jwk
    );

    expect(await findOrder(orderSendID, localTokenPair)).not.toEqual(undefined);

    // create second order (market order)
    const orderReceiveID = await createOrder(
      { qty: qtyToTrade, token: localTokenPair[1], tokenPair: localTokenPair },
      wallet2.jwk
    );

    expect(await findOrder(orderReceiveID, localTokenPair)).toEqual(undefined);
    expect(await findOrder(orderSendID, localTokenPair)).toEqual(undefined);

    const contractState = await state();
    const foreignCalls = contractState.foreignCalls.filter(
      ({ txID }) => txID === orderReceiveID
    );

    expect(
      foreignCalls.find(
        ({ input, contract }: ForeignCallInterface) =>
          contract === localTokenPair[1] &&
          input.target === wallet1.address &&
          input.qty === qtyToTrade
      )
    ).not.toEqual(undefined);
    expect(
      foreignCalls.find(
        ({ input, contract }: ForeignCallInterface) =>
          contract === localTokenPair[0] &&
          input.target === wallet2.address &&
          input.qty === qtyToTrade
      )
    ).not.toEqual(undefined);
  });

  // existing order is greater than new order (new order matches instantly with partially matched existing)
  it("should match a greater order with the new lesser order", async () => {
    const lesserQty = 500;

    // create first order
    const orderSendID = await createOrder(
      {
        qty: lesserQty * 2,
        token: localTokenPair[0],
        price: 1,
        tokenPair: localTokenPair
      },
      wallet1.jwk
    );

    expect(await findOrder(orderSendID, localTokenPair)).not.toEqual(undefined);

    // create second order
    const orderReceiveID = await createOrder(
      {
        qty: lesserQty,
        token: localTokenPair[1],
        price: 1,
        tokenPair: localTokenPair
      },
      wallet2.jwk
    );

    const sendOrder = await findOrder(orderSendID, localTokenPair);

    expect(sendOrder).not.toEqual(undefined);
    expect(sendOrder.quantity).toEqual(lesserQty);
    expect(await findOrder(orderReceiveID, localTokenPair)).toEqual(undefined);

    const contractState = await state();
    const foreignCalls = contractState.foreignCalls.filter(
      ({ txID }) => txID === orderReceiveID
    );

    expect(
      foreignCalls.find(
        ({ input, contract }: ForeignCallInterface) =>
          contract === localTokenPair[1] &&
          input.target === wallet1.address &&
          input.qty === lesserQty
      )
    ).not.toEqual(undefined);
    expect(
      foreignCalls.find(
        ({ input, contract }: ForeignCallInterface) =>
          contract === localTokenPair[0] &&
          input.target === wallet2.address &&
          input.qty === lesserQty
      )
    ).not.toEqual(undefined);
  });

  // new order is greater than existing (new order partially matches and is left in orderbook while existing matches completely)
  it("should match a lesser order with the new greater order", async () => {
    const lesserQty = 2000;

    // create first order
    const orderSendID = await createOrder(
      {
        qty: lesserQty,
        token: localTokenPairTwo[0],
        price: 1,
        tokenPair: localTokenPairTwo
      },
      wallet1.jwk
    );

    expect(await findOrder(orderSendID, localTokenPairTwo)).not.toEqual(
      undefined
    );

    // create second order
    const orderReceiveID = await createOrder(
      {
        qty: lesserQty * 2,
        token: localTokenPairTwo[1],
        price: 1,
        tokenPair: localTokenPairTwo
      },
      wallet2.jwk
    );

    const receiveOrder = await findOrder(orderReceiveID, localTokenPairTwo);

    expect(receiveOrder).not.toEqual(undefined);
    expect(receiveOrder.quantity).toEqual(lesserQty);
    expect(await findOrder(orderSendID, localTokenPairTwo)).toEqual(undefined);

    const contractState = await state();
    const foreignCalls = contractState.foreignCalls.filter(
      ({ txID }) => txID === orderReceiveID
    );

    expect(
      foreignCalls.find(
        ({ input, contract }: ForeignCallInterface) =>
          contract === localTokenPairTwo[1] &&
          input.target === wallet1.address &&
          input.qty === lesserQty
      )
    ).not.toEqual(undefined);
    expect(
      foreignCalls.find(
        ({ input, contract }: ForeignCallInterface) =>
          contract === localTokenPairTwo[0] && input.qty === lesserQty
      )
    ).not.toEqual(undefined);
  });

  it("should cancel order", async () => {
    const qty = 1000;
    const orderID = await createOrder(
      { qty, token: localTokenPair[0], price: 10, tokenPair: localTokenPair },
      wallet1.jwk
    );

    await interactWrite(arweave, wallet1.jwk, CONTRACT_ID, {
      function: "cancelOrder",
      orderID
    });
    await mine();

    expect(await findOrder(orderID, localTokenPair)).toEqual(undefined);

    const foreignCalls = (await state()).foreignCalls;
    expect(
      foreignCalls.find(
        ({ input, contract }: ForeignCallInterface) =>
          contract === localTokenPair[0] &&
          input.qty === qty &&
          input.target === wallet1.address
      )
    ).not.toEqual(undefined);
  });

  it("should toggle pair gatekeeper", async () => {
    await interactWrite(arweave, wallet1.jwk, CONTRACT_ID, {
      function: "togglePairGatekeeper"
    });
    await mine();

    const contractState = await state();

    expect(contractState.pairGatekeeper).toEqual(true);
  });
});

async function mine() {
  await arweave.api.get("mine");
}
