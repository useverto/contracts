import { ActionInterface, InviteInterface, StateInterface } from "../faces";

export const Invite = (state: StateInterface, action: ActionInterface) => {
  const balances = state.balances;
  const invites = state.invites;
  const caller = action.caller;

  const input: InviteInterface = action.input;
  const target = input.target;

  ContractAssert(caller in invites, "Caller has not been invited.");
  ContractAssert(
    /[a-z0-9_-]{43}/i.test(target),
    "Caller did not supply a valid target."
  );
  ContractAssert(invites[caller] > 0, "Caller has run out of invites.");

  if (target in balances || target in invites) {
    throw new ContractError("Target has already been invited.");
  }

  balances[target] = 1;
  invites[target] = 3;
  invites[caller] -= 1;

  return { ...state, balances, invites };
};
