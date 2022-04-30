import {
  OrderInterface,
  ForeignCallInterface,
  PriceLogInterface
} from "../faces";

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
      // reduce the current order in the loop
      currentOrder.quantity -= fillAmount;

      // fill the remaining tokens
      receiveAmount += remainingQuantity * reversePrice;

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

      // no tokens left to be matched
      remainingQuantity = 0;

      break;
    } else {
      // the input order is going to be partially filled

      // add all the tokens from the current order to fill up
      // the input order
      receiveAmount += currentOrder.quantity;

      // the amount the current order creator will receive
      const sendAmount = currentOrder.quantity * currentOrder.price;

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
