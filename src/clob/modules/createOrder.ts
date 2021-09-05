import {
  ActionInterface,
  StateInterface,
  CreateOrderInterface,
} from "../faces";
import { ensureValidTransfer, isAddress } from "../utils";

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
    isAddress(usedPair[0]) && isAddress(usedPair[1]),
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
      contractInput = tag.get("value", { decode: true, string: true });
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
  ContractAssert(isAddress(contractID), "Invalid contract ID format");

  // Test tokenTx for valid contract interaction
  await ensureValidTransfer(contractID, tokenTx);

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

  return state;
};

function matchOrder(
  inputToken: string, // Token of the new order
  inputQuantity: number,
  inputCreator: string,
  inputTransaction,
  orderbook: [
    {
      transaction: string;
      creator: string;
      token: string; // Opposite token of the new order
      price: number;
      quantity: number;
      originalQuantity: number;
    }?
  ],
  inputPrice?: number,
  foreignCalls?: [object]
) {
  if (inputPrice) {
    // Limit order
    // Compare quantity with first order in book
    // Subtract order amount
    // Add to outbox to transfer tokens
    const fillAmount = inputQuantity * inputPrice;
    for (let i = 0; i < orderbook.length; i++) {
      if (inputPrice === orderbook[i].price) {
        if (fillAmount === orderbook[i].quantity) {
          // ~~ Matched orders completely filled ~~
          // Send tokens from new order to existing order creator
          foreignCalls.push(
            {
              contract: inputToken,
              input: {
                function: "transfer",
                target: orderbook[i].creator,
                qty: inputQuantity,
              },
            },
            // Send tokens from existing order to new order creator
            {
              contract: orderbook[i].token,
              input: {
                function: "transfer",
                target: inputCreator,
                qty: orderbook[i].quantity,
              },
            }
          );
          // Remove existing order
          orderbook.splice(i, 1);

          return {
            orderbook,
            foreignCalls,
          };
        } else if (fillAmount < orderbook[i].quantity) {
          // ~~ Input order filled; existing order not completely filled ~~
          // Send existing order creator tokens from new order
          foreignCalls.push(
            {
              contract: inputToken,
              input: {
                function: "transfer",
                target: orderbook[i].creator,
                qty: inputQuantity,
              },
            },
            // Send new order creator tokens from existing order
            {
              contract: orderbook[i].token,
              input: {
                function: "transfer",
                target: inputCreator,
                qty: fillAmount,
              },
            }
          );
          // Keep existing order but subtract order amount from input
          orderbook[i].quantity -= fillAmount;

          return {
            orderbook,
            foreignCalls,
          };
        } else if (fillAmount > orderbook[i].quantity) {
          // ~~ Input order not completely filled; existing order filled ~~
          // Send existing order creator tokens from new order
          foreignCalls.push(
            {
              contract: inputToken,
              input: {
                function: "transfer",
                target: orderbook[i].creator,
                qty: 0,
              },
            },
            // Send new order creator tokens from existing order
            {}
          );
          // Remove existing order & subtract input order amount from existing
          orderbook.splice(i, 1);
          orderbook.push({
            transaction: inputTransaction,
            creator: inputCreator,
            token: inputToken,
            price: inputPrice,
            quantity: inputQuantity - 0,
            originalQuantity: inputQuantity,
          });
          // Call matchOrder() recursively
        }
      }
    }
  } else {
    // Market order
  }
}
