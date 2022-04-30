import {
  OrderInterface,
  ForeignCallInterface,
  PriceLogInterface
} from "../faces";
import { isInOrderBook } from "../utils";

export default function matchOrder(
  input: {
    /** Token of the new order */
    token: string;
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
  orderbook: OrderInterface[],
  foreignCalls: ForeignCallInterface[] = [],
  logs: PriceLogInterface[] = []
): {
  orderbook: OrderInterface[];
  foreignCalls: ForeignCallInterface[];
  logs?: PriceLogInterface[];
} {
  const orderType = input.price ? "limit" : "market";

  // orders that are made in the reverse direction as the current one.
  // this order can match with the reverse orders only
  const reverseOrders = orderbook.filter(
    (order) => input.token !== order.token && order.id !== input.transaction
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
      token: input.token,
      price: input.price,
      quantity: input.quantity,
      originalQuantity: input.quantity
    });

    return {
      orderbook,
      foreignCalls
    };
  }

  // the total amount of tokens we will receive
  // if the order type is "market", this changes
  // for each order in the orderbook
  // if it is a "limit" order, this will always
  // be the same
  let fillAmount: number;

  // loop through orders against this order
  for (let i = 0; i < orderbook.length; i++) {
    const currentOrder = orderbook[i];

    // only loop orders that are against this order
    if (
      input.token === currentOrder.token ||
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
    fillAmount =
      orderType === "limit"
        ? input.quantity * input.price
        : input.quantity * reversePrice;

    // TODO: completelly fill both orders

    // TODO: comletelly fill only input order

    // TODO: comletelly fill only the order from the orderbook

    // the input order is going to be completely filled
    if (fillAmount < currentOrder.quantity) {
      // reduce the current order in the loop
      currentOrder.quantity -= fillAmount;

      // send tokens to the current order's creator
      foreignCalls.push({
        txID: SmartWeave.transaction.id,
        contract: currentOrder.token,
        input: {
          function: "transfer",
          target: currentOrder.creator,
          qty: fillAmount
        }
      });
    }
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

        // this is 100% of the "current order in the loop"'s quantity
        const sendAmount = orderbook[i].quantity;

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
              qty: sendAmount
            }
          }
        );

        // push the swap to the logs
        logs.push({
          id: orderbook[i].id,
          price: inputPrice || convertedExistingPrice,
          qty: sendAmount
        });

        // Remove existing order
        orderbook.splice(i - 1, 1);

        return {
          orderbook,
          foreignCalls,
          logs
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

        // push the swap to the logs
        logs.push({
          id: orderbook[i].id,
          price: inputPrice || convertedExistingPrice,
          qty: fillAmount
        });

        // Keep existing order but subtract order amount from input
        orderbook[i].quantity -= fillAmount;

        return {
          orderbook,
          foreignCalls,
          logs
        };
      } else if (fillAmount > orderbook[i].quantity) {
        // ~~ Input order not completely filled; existing order filled ~~
        // Send existing order creator tokens from new order
        console.log(
          "6) ~~ Input order not completely filled; existing order filled ~~"
        );

        const sendAmount = orderbook[i].quantity;

        foreignCalls.push(
          {
            txID: SmartWeave.transaction.id,
            contract: inputToken,
            input: {
              function: "transfer",
              target: orderbook[i].creator,
              qty: inputQuantity - sendAmount * convertedExistingPrice
            }
          },
          // Send new order creator tokens from existing order
          {
            txID: SmartWeave.transaction.id,
            contract: orderbook[i].token,
            input: {
              function: "transfer",
              target: inputCreator,
              qty: sendAmount
            }
          }
        );

        // push the swap to the logs
        logs.push({
          id: orderbook[i].id,
          price: inputPrice || convertedExistingPrice,
          qty: sendAmount
        });

        console.log("INPUT QUANTITY", inputQuantity);
        console.log("ORDERBOOK ORDER QUANTITY", orderbook[i].quantity);
        console.log("CONVERTED EXISTING PRICE", convertedExistingPrice);

        // if this order is already pushed modify the pushed
        // order's quantity instead of pushing it again
        if (!isInOrderBook(inputTransaction, orderbook)) {
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
          foreignCalls,
          logs
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

  if (isInOrderBook(inputTransaction, orderbook)) {
    return {
      orderbook,
      foreignCalls,
      logs
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
    foreignCalls,
    logs
  };
}
