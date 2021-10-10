import { ActionInterface, BalanceInterface, StateInterface } from "../faces";

export const Balance = (state: StateInterface, action: ActionInterface) => {
  const balances = state.balances;
  const caller = action.caller;

  const input: BalanceInterface = action.input;
  const target = input.target || caller;

  ContractAssert(
    /[a-z0-9_-]{43}/i.test(target),
    "Caller did not supply a valid target."
  );

  let balance = 0;
  if (target in balances) {
    balance = balances[target];
  }

  return { target, balance };
};
