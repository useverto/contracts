import { ActionInterface, StateInterface, TransferInterface } from "../faces";

export const Transfer = (state: StateInterface, action: ActionInterface) => {
  const balances = state.balances;
  const caller = action.caller;

  const input: TransferInterface = action.input;
  const target = input.target;
  const qty = input.qty;

  ContractAssert(
    /[a-z0-9_-]{43}/i.test(target),
    "Caller did not supply a valid target."
  );
  ContractAssert(
    Number.isInteger(qty),
    `Invalid value for "qty". Must be an integer.`
  );
  ContractAssert(qty > 0 && caller !== target, "Invalid token transfer.");
  if (!(caller in balances)) {
    throw new ContractError("Caller doesn't own any tokens.");
  }
  if (balances[caller] < qty) {
    throw new ContractError(
      `Caller balance not high enough to send ${qty} token(s)!`
    );
  }

  balances[caller] -= qty;
  if (target in balances) {
    balances[target] += qty;
  } else {
    balances[target] = qty;
  }

  return { ...state, balances };
};
