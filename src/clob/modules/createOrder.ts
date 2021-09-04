import {
  ActionInterface,
  StateInterface,
  CreateOrderInterface,
} from "../faces";

export const CreateOrder = async (
  state: StateInterface,
  action: ActionInterface
) => {
  const caller = action.caller;
  const input: CreateOrderInterface = action.input;

  const pairs = state.pairs;
  const usedPair = input.pair;
  const tokenTx = input.transaction;
  const price = input.price;
  let pairIndex;

  // Test that pairs are valid contract strings
  ContractAssert(
    /[a-z0-9_-]{43}/i.test(usedPair[0]) && /[a-z0-9_-]{43}/i.test(usedPair[1]),
    "One of two supplied pairs is invalid"
  );

  // Test if pair already exists
  for (let i = 0; i < pairs.length; i++) {
    const currentPair = pairs[i].pair;
    if (
      currentPair.includes(usedPair[0]) &&
      currentPair.includes(usedPair[1])
    ) {
      pairIndex = pairs[i];
    }
  }
  ContractAssert(pairIndex !== undefined, "This pair does not exist yet");

  let contractID = "",
    contractInput,
    transferTx;

  // Grab the contract id of the token they are transferring in the supplied tx
  try {
    transferTx = await SmartWeave.unsafeClient.transactions.get(tokenTx);
  } catch (err) {
    throw new ContractError(err);
  }

  transferTx.get("tags").forEach((tag) => {
    if (tag.get("name", { decode: true, string: true }) === "Contract") {
      contractID = tag.get("value", { decode: true, string: true });
    }
    if (tag.get("name", { decode: true, string: true }) === "Input") {
      contractID = tag.get("value", { decode: true, string: true });
    }
  });

  ContractAssert(
    typeof contractID === "string",
    "Invalid contract ID: not a string"
  );
  ContractAssert(
    contractID !== "",
    "No contract ID found in the transfer transaction"
  );
  ContractAssert(
    /[a-z0-9_-]{43}/i.test(contractID),
    "Invalid contract ID format"
  );

  // Test tokenTx for valid contract interaction
  const {
    validity: contractTxValidities,
    // @ts-ignore
  } = await SmartWeave.contracts.readContractState(contractID, undefined, true);

  // The transfer tx of the token somewhy does not exist
  ContractAssert(
    tokenTx in contractTxValidities,
    "Could not find transfer transaction"
  );

  // Invalid transfer
  ContractAssert(
    contractTxValidities[tokenTx],
    "The transfer transaction is an invalid interaction"
  );

  let sortedOrderbook = state.pairs[pairIndex].orders.sort((a, b) =>
    a.price > b.price ? 1 : -1
  );

  // Check for limit order or market order
  if (price) {
    // Check supplied price
    ContractAssert(typeof price === "number", "Invalid price: not a number");

    // Limit order
  } else {
    // Market order
  }

  state.pairs.push({
    pair: usedPair,
    orders: [],
  });
  return { ...state };
};

function matchOrder(
  token: string,
  quantity: number,
  orderbook: [
    {
      transaction: string;
      creator: string;
      token: string;
      price: number;
    }?
  ],
  price?: number
) {
  if (price) {
    // Limit order
    // Compare quantity with first order in book
    // Subtract order amount
    // Add to outbox to transfer tokens
  } else {
    // Market order
  }
}
