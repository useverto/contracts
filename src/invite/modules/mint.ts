import { ActionInterface, MintInterface, StateInterface } from "../faces";

export const Mint = (state: StateInterface, action: ActionInterface) => {
  const owner = SmartWeave.contract.owner;
  const balances = state.balances;
  const invites = state.invites;
  const caller = action.caller;

  const input: MintInterface = action.input;
  const target = input.target;

  ContractAssert(caller === owner, "Caller is not the contract owner.");
  ContractAssert(
    /[a-z0-9_-]{43}/i.test(target),
    "Caller did not supply a valid target."
  );

  if (target in balances || target in invites) {
    // TODO(@tate): Nice error message in this case :)
    throw new ContractError("");
  }

  balances[target] = 1;
  invites[target] = 3;

  return { ...state, balances, invites };
};
