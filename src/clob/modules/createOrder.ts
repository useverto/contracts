import {
  ActionInterface,
  StateInterface,
  CreateOrderInterface,
  OrderInterface,
  ForeignCallInterface,
  PriceLogInterface
} from "../faces";
import { ensureValidTransfer, isAddress } from "../utils";
import Transaction from "arweave/node/lib/transaction";

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

  // test that pairs are valid contract strings
  ContractAssert(
    isAddress(usedPair[0]) && isAddress(usedPair[1]),
    "One of two supplied pairs is invalid"
  );

  // id of the transferred token
  let contractID = "";
  // transfer interaction input
  let contractInput: {
    function: string;
    [key: string]: any;
  };
  // transfer transaction object
  let transferTx: Transaction;

  // grab the contract id of the token they are transferring in the supplied tx
  try {
    transferTx = await SmartWeave.unsafeClient.transactions.get(tokenTx);
  } catch (err) {
    throw new ContractError(err);
  }

  // @ts-expect-error
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
  await ensureValidTransfer(contractID, tokenTx, caller);

  // find the pair index
  const pairIndex = pairs.findIndex(
    ({ pair }) => pair.includes(usedPair[0]) && pair.includes(usedPair[1])
  );

  // test if the pair already exists
  if (pairIndex === -1 || !pairIndex) {
    // send back the founds that the user sent to this contract
    state.foreignCalls.push({
      txID: SmartWeave.transaction.id,
      contract: contractID,
      input: {
        function: "transfer",
        target: caller,
        qty: contractInput.qty
      }
    });

    // throw pair doesn't exist error
    throw new ContractError("This pair does not exist yet");
  }

  // Sort orderbook based on prices
  let sortedOrderbook = state.pairs[pairIndex].orders.sort((a, b) =>
    a.price > b.price ? 1 : -1
  );

  // Invoke the recursive matching function
  const { orderbook, foreignCalls, logs } = matchOrder(
    {
      pair: {
        from: contractID,
        to: usedPair.find((val) => val !== contractID)[0]
      },
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

export default function matchOrder(
  input: {
    /** Token of the new order */
    pair: {
      /** ID of the token the user is trading from */
      from: string;
      /** ID of the token the user is trading for */
      to: string;
    };
    /** Quantity of the order */
    quantity: number;
    /** Address of the order creator */
    creator: string;
    /** Interaction ID */
    transaction: string;
    /** Transfer transaction ID */
    transfer: string;
    /** Optional limit price of the order */
    price?: number;
  },
  orderbook: OrderInterface[]
): {
  orderbook: OrderInterface[];
  foreignCalls: ForeignCallInterface[];
  logs?: PriceLogInterface[];
} {
  const orderType = input.price ? "limit" : "market";
  const foreignCalls: ForeignCallInterface[] = [];
  const logs: PriceLogInterface[] = [];

  // orders that are made in the reverse direction as the current one.
  // this order can match with the reverse orders only
  const reverseOrders = orderbook.filter(
    (order) => input.pair.from !== order.token && order.id !== input.transaction
  );

  // if there are no orders against the token we are buying, we only push it
  // but first, we check if it is a limit order
  if (!reverseOrders.length) {
    // ensure that the first order is a limit order
    ContractAssert(
      orderType === "limit",
      'The first order for a pair can only be a "limit" order'
    );

    // push to the orderbook
    orderbook.push({
      id: input.transaction,
      transfer: input.transfer,
      creator: input.creator,
      token: input.pair.from,
      price: input.price,
      quantity: input.quantity,
      originalQuantity: input.quantity
    });

    return {
      orderbook,
      foreignCalls
    };
  }

  // the total amount of tokens the user would receive
  // if the order type is "market", this changes
  // for each order in the orderbook
  // if it is a "limit" order, this will always
  // be the same
  let fillAmount: number;

  // the total amount of tokens the user of
  // the input order will receive
  let receiveAmount = 0;

  // the remaining tokens to be matched with an order
  let remainingQuantity = input.quantity;

  // loop through orders against this order
  for (let i = 0; i < orderbook.length; i++) {
    const currentOrder = orderbook[i];

    // only loop orders that are against this order
    if (
      input.pair.from === currentOrder.token ||
      currentOrder.id === input.transaction
    )
      continue;

    // price of the current order reversed to the input token
    const reversePrice = 1 / currentOrder.price;

    // continue if the current order's price matches
    // the input order's price (if the order is a limit order)
    if (orderType === "limit" && input.price !== reversePrice) continue;

    // set the total amount of tokens we would receive
    // from this order
    fillAmount = remainingQuantity * (input.price ?? reversePrice);

    // the input order is going to be completely filled
    if (fillAmount <= currentOrder.quantity) {
      // the input order creator receives this much
      // of the tokens from the current order
      const receiveFromCurrent = remainingQuantity * reversePrice;

      // reduce the current order in the loop
      currentOrder.quantity -= fillAmount;

      // fill the remaining tokens
      receiveAmount += receiveFromCurrent;

      // send tokens to the current order's creator
      foreignCalls.push({
        txID: SmartWeave.transaction.id,
        contract: input.pair.from,
        input: {
          function: "transfer",
          target: currentOrder.creator,
          qty: remainingQuantity
        }
      });

      // push the swap to the logs
      logs.push({
        id: currentOrder.id,
        price: input.price || reversePrice,
        qty: receiveFromCurrent
      });

      // no tokens left in the input order to be matched
      remainingQuantity = 0;

      break;
    } else {
      // the input order is going to be partially filled
      // but the current order will be

      // the input order creator receives this much
      // of the tokens from the current order
      const receiveFromCurrent = currentOrder.quantity;

      // add all the tokens from the current order to fill up
      // the input order
      receiveAmount += receiveFromCurrent;

      // the amount the current order creator will receive
      const sendAmount = receiveFromCurrent * currentOrder.price;

      // reduce the remaining tokens to be matched
      // by the amount the user is going to receive
      // from this order
      remainingQuantity -= sendAmount;

      // send tokens to the current order's creator
      foreignCalls.push({
        txID: SmartWeave.transaction.id,
        contract: input.pair.from,
        input: {
          function: "transfer",
          target: currentOrder.creator,
          qty: sendAmount
        }
      });

      // push the swap to the logs
      logs.push({
        id: currentOrder.id,
        price: input.price || reversePrice,
        qty: receiveFromCurrent
      });

      // no tokens left in the current order to be matched
      currentOrder.quantity = 0;
    }

    // if the current order is completely filled,
    // remove it from the orderbook
    if (currentOrder.quantity === 0) {
      orderbook = orderbook.filter((val) => val.id !== currentOrder.id);
    }
  }

  // if the input order is not completely filled,
  // push it to the orderbook
  if (remainingQuantity > 0) {
    orderbook.push({
      id: input.transaction,
      transfer: input.transfer,
      creator: input.creator,
      token: input.pair.from,
      price: input.price,
      quantity: remainingQuantity,
      originalQuantity: input.quantity
    });
  }

  // send tokens to the input order's creator
  foreignCalls.push({
    txID: SmartWeave.transaction.id,
    contract: input.pair.to,
    input: {
      function: "transfer",
      target: input.creator,
      qty: receiveAmount
    }
  });

  return {
    orderbook,
    foreignCalls,
    logs
  };
}
