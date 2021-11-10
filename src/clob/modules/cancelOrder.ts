import {
  ActionInterface,
  StateInterface,
  CancelOrderInterface
} from "../faces";
import { isAddress } from "../utils";

export const CancelOrder = async (
  state: StateInterface,
  action: ActionInterface
): Promise<StateInterface> => {
  const caller = action.caller;
  const input: CancelOrderInterface = action.input;

  const orderTxID = input.orderID;

  // Verify order ID
  ContractAssert(isAddress(orderTxID), "Invalid order ID");

  // Remap all orders into one array
  const allOrders = state.pairs.map((pair) => pair.orders).flat(1);

  // Get the order to cancel
  const order = allOrders.find(({ id }) => id === orderTxID);

  // Ensure that the order exists
  ContractAssert(order !== undefined, "Order does not exist");

  // Ensure that the creator of the order is the caller
  ContractAssert(
    order.creator === caller,
    "Caller is not the creator of the order"
  );

  // Send back the *not* filled tokens to the creator of the order
  state.foreignCalls.push({
    txID: SmartWeave.transaction.id,
    contract: order.token,
    input: {
      function: "transfer",
      target: caller,
      qty: order.quantity
    }
  });

  // The pair that the order belongs to
  const acitvePair = state.pairs.find((pair) =>
    pair.orders.find(({ id }) => id === orderTxID)
  );

  // Remove cancelled order
  acitvePair.orders = acitvePair.orders.filter(({ id }) => id !== orderTxID);

  return state;
};
