import {
  OrderInterface,
  ForeignCallInterface,
  PriceLogInterface
} from "../faces";
import { isInOrderBook } from "../utils";

export default function matchOrder(
  inputToken: string, // Token of the new order
  inputQuantity: number,
  inputCreator: string,
  inputTransaction: string,
  inputTransfer: string,
  orderbook: OrderInterface[],
  inputPrice?: number,
  foreignCalls: ForeignCallInterface[] = [],
  logs: PriceLogInterface[] = []
): {
  orderbook: OrderInterface[];
  foreignCalls: ForeignCallInterface[];
  logs?: PriceLogInterface[];
} {
  let fillAmount: number;
  // if there are no orders, push it
  if (
    orderbook.filter(
      (order) => inputToken !== order.token && order.id !== inputTransaction
    ).length === 0
  ) {
    // The input price should be defined here, because this is a first order for this pair
    // TODO: @t8 check this
    ContractAssert(
      !!inputPrice,
      "Input price should be defined for the first order to a pair"
    );

    if (isInOrderBook(inputTransaction, orderbook)) {
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
