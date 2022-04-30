import {
  ActionInterface,
  StateInterface,
  CreateOrderInterface
} from "../faces";
import { ensureValidTransfer, isAddress } from "../utils";
import matchOrder from "../order/match";

export const CreateOrder = async (
  state: StateInterface,
  action: ActionInterface
): Promise<StateInterface> => {
  const caller = action.caller;
  const input: CreateOrderInterface = action.input;

  const pairs = state.pairs;
  const usedPair = input.pair;
  const tokenTx = input.transaction;
  const price = input.price;

  // Test that pairs are valid contract strings
  ContractAssert(
    isAddress(usedPair[0]) && isAddress(usedPair[1]),
    "One of two supplied pairs is invalid"
  );

  // Find the pair index
  const pairIndex = pairs.findIndex(
    ({ pair }) => pair.includes(usedPair[0]) && pair.includes(usedPair[1])
  );

  // Test if the pair already exists
  ContractAssert(pairIndex !== undefined, "This pair does not exist yet");

  // id of the transferred token
  let contractID = "",
    // transfer interaction input
    contractInput,
    // transfer transaction object
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
      contractInput = JSON.parse(
        tag.get("value", { decode: true, string: true })
      );
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

  const fromToken = usedPair[0];

  ContractAssert(
    fromToken === contractID,
    "Invalid transfer transaction, using the wrong token. The transferred token has to be the first item in the pair"
  );
  ContractAssert(isAddress(contractID), "Invalid contract ID format");

  // Test tokenTx for valid contract interaction
  await ensureValidTransfer(contractID, tokenTx);

  // Sort orderbook based on prices
  let sortedOrderbook = state.pairs[pairIndex].orders.sort((a, b) =>
    a.price > b.price ? 1 : -1
  );

  // Invoke the recursive matching function
  const { orderbook, foreignCalls, logs } = matchOrder(
    {
      token: contractID,
      quantity: contractInput.qty,
      creator: caller,
      transaction: SmartWeave.transaction.id,
      transfer: tokenTx,
      price
    },
    sortedOrderbook
  );

  // Update orderbook accordingly
  state.pairs[pairIndex].orders = orderbook;

  // add this orders price log as the last order price log to the pair object
  state.pairs[pairIndex].priceLogs = {
    orderID: SmartWeave.transaction.id,
    token: fromToken,
    logs: logs ?? []
  };

  // Update foreignCalls accordingly for tokens to be sent
  for (let i = 0; i < foreignCalls.length; i++) {
    state.foreignCalls.push(foreignCalls[i]);
  }

  return state;
};
