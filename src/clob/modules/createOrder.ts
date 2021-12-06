import {
  ActionInterface,
  StateInterface,
  CreateOrderInterface,
  OrderInterface,
  ForeignCallInterface
} from "../faces";
import { ensureValidTransfer, isAddress } from "../utils";

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
  ContractAssert(
    usedPair.includes(contractID),
    "Invalid transfer transaction, using the wrong token"
  );
  ContractAssert(isAddress(contractID), "Invalid contract ID format");

  // Test tokenTx for valid contract interaction
  await ensureValidTransfer(contractID, tokenTx);

  // Sort orderbook based on prices
  let sortedOrderbook = state.pairs[pairIndex].orders.sort((a, b) =>
    a.price > b.price ? 1 : -1
  );

  // Invoke the recursive matching function
  const { orderbook, foreignCalls } = matchOrder(
    contractID,
    contractInput.qty,
    caller,
    SmartWeave.transaction.id,
    tokenTx,
    sortedOrderbook,
    price
  );

  // Update orderbook accordingly
  state.pairs[pairIndex].orders = orderbook;

  // Update foreignCalls accordingly for tokens to be sent
  for (let i = 0; i < foreignCalls.length; i++) {
    state.foreignCalls.push(foreignCalls[i]);
  }

  return state;
};

function matchOrder(
  inputToken: string, // Token of the new order
  inputQuantity: number,
  inputCreator: string,
  inputTransaction: string,
  inputTransfer: string,
  orderbook: OrderInterface[],
  inputPrice?: number,
  foreignCalls: ForeignCallInterface[] = []
): {
  orderbook: OrderInterface[];
  foreignCalls: ForeignCallInterface[];
} {
  const orderPushed = !!orderbook.find(
    (order) => order.id === inputTransaction
  );
  let fillAmount: number;
  // if there are no orders, push it
  if (
    orderbook.filter(
      (order) => inputToken !== order.token && order.id !== inputTransaction
    ).length === 0
  ) {
    if (orderPushed) {
      return {
        orderbook,
        foreignCalls
      };
    }

    // The input price should be defined here, because this is a first order for this pair
    // TODO: @t8 check this
    ContractAssert(
      !!inputPrice,
      "Input price should be defined for the first order to a pair"
    );

    return {
      orderbook: [
        ...orderbook,
        {
          id: inputTransaction,
          transfer: inputTransfer,
          creator: inputCreator,
          token: inputToken,
          price: inputPrice,
          quantity: inputQuantity,
          originalQuantity: inputQuantity
        }
      ],
      foreignCalls
    };
  }

  for (let i = 0; i < orderbook.length; i++) {
    // continue if the sent token is the same
    if (inputToken === orderbook[i].token) continue;

    // continue if the current order in this loop equals
    // the order that we are filling
    // this can happen if the order was not filled 100%
    // and matchOrder was called recursively
    if (orderbook[i].id === inputTransaction) continue;

    const convertedExistingPrice = 1 / orderbook[i].price;

    if (inputPrice) {
      console.log("1) LIMIT ORDER");
      // Limit Order
      ContractAssert(
        typeof inputPrice === "number",
        "Invalid price: not a number"
      );
      fillAmount = inputQuantity * inputPrice;
    } else {
      console.log("2) MARKET ORDER");
      // Market order
      fillAmount = inputQuantity * convertedExistingPrice; // Existing price in units of existingToken/inputToken
    }

    if (inputPrice === convertedExistingPrice || !inputPrice) {
      console.log("3) Found compatible order");
      console.log(orderbook[i]);
      if (fillAmount === orderbook[i].quantity) {
        // ~~ Matched orders completely filled ~~
        // Send tokens from new order to existing order creator
        console.log("4) ~~ Matched orders completely filled ~~");
        foreignCalls.push(
          {
            txID: SmartWeave.transaction.id,
            contract: inputToken,
            input: {
              function: "transfer",
              target: orderbook[i].creator,
              qty: inputQuantity
            }
          },
          // Send tokens from existing order to new order creator
          {
            txID: SmartWeave.transaction.id,
            contract: orderbook[i].token,
            input: {
              function: "transfer",
              target: inputCreator,
              qty: orderbook[i].quantity
            }
          }
        );

        // Remove existing order
        orderbook.splice(i - 1, 1);

        return {
          orderbook,
          foreignCalls
        };
      } else if (fillAmount < orderbook[i].quantity) {
        // ~~ Input order filled; existing order not completely filled ~~
        // Send existing order creator tokens from new order
        console.log(
          "5) ~~ Input order filled; existing order not completely filled ~~"
        );
        foreignCalls.push(
          {
            txID: SmartWeave.transaction.id,
            contract: inputToken,
            input: {
              function: "transfer",
              target: orderbook[i].creator,
              qty: inputQuantity
            }
          },
          // Send new order creator tokens from existing order
          {
            txID: SmartWeave.transaction.id,
            contract: orderbook[i].token,
            input: {
              function: "transfer",
              target: inputCreator,
              qty: fillAmount
            }
          }
        );
        // Keep existing order but subtract order amount from input
        orderbook[i].quantity -= fillAmount;

        return {
          orderbook,
          foreignCalls
        };
      } else if (fillAmount > orderbook[i].quantity) {
        // ~~ Input order not completely filled; existing order filled ~~
        // Send existing order creator tokens from new order
        console.log(
          "6) ~~ Input order not completely filled; existing order filled ~~"
        );
        foreignCalls.push(
          {
            txID: SmartWeave.transaction.id,
            contract: inputToken,
            input: {
              function: "transfer",
              target: orderbook[i].creator,
              qty:
                inputQuantity - orderbook[i].quantity * convertedExistingPrice
            }
          },
          // Send new order creator tokens from existing order
          {
            txID: SmartWeave.transaction.id,
            contract: orderbook[i].token,
            input: {
              function: "transfer",
              target: inputCreator,
              qty: orderbook[i].quantity
            }
          }
        );
        console.log("INPUT QUANTITY", inputQuantity);
        console.log("ORDERBOOK ORDER QUANTITY", orderbook[i].quantity);
        console.log("CONVERTED EXISTING PRICE", convertedExistingPrice);

        // if this order is already pushed modify the pushed
        // order's quantity instead of pushing it again
        if (!orderPushed) {
          console.log("NOT ORDER PUSHED");
          orderbook.push({
            id: inputTransaction,
            transfer: inputTransfer,
            creator: inputCreator,
            token: inputToken,
            price: convertedExistingPrice,
            quantity:
              inputQuantity - orderbook[i].quantity * convertedExistingPrice, // Input price in units of inputToken/existingToken
            originalQuantity: inputQuantity
          });
        } else {
          // TODO: somewhy the order is undefined here
          const order = orderbook.find(
            (order) => order.id === inputTransaction
          );
          console.log(
            order.quantity - orderbook[i].quantity * convertedExistingPrice
          );
          order.quantity -= orderbook[i].quantity * convertedExistingPrice;
        }

        // Remove existing order & subtract input order amount from existing
        orderbook = orderbook.filter((order) => order.id !== orderbook[i].id);

        // Call matchOrder() recursively
        console.log("7) Calling recursively");

        return matchOrder(
          inputToken,
          inputQuantity,
          inputCreator,
          inputTransaction,
          inputTransfer,
          orderbook,
          convertedExistingPrice,
          foreignCalls
        );
      }
    }
  }

  // TODO: @t8 check this
  // moved it out of the loop, because
  // the loop should continue until it finds
  // an order with the input price and if it
  // doesn't, then push it to the orderbook.
  // This part however just does this for each
  // loop: if the current loop does not match the
  // inputPrice, it returns

  if (orderPushed) {
    return {
      orderbook,
      foreignCalls
    };
  }

  return {
    orderbook: [
      ...orderbook,
      {
        id: inputTransaction,
        transfer: inputTransfer,
        creator: inputCreator,
        token: inputToken,
        price: inputPrice,
        quantity: inputQuantity,
        originalQuantity: inputQuantity
      }
    ],
    foreignCalls
  };
}
