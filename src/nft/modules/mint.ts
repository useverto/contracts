import { ActionInterface, MintInterface, StateInterface } from "../faces";

export const Mint = (state: StateInterface, action: ActionInterface) => {
  const owner = state.owner;
  const allowMinting = state.allowMinting;
  const balances = state.balances;
  const caller = action.caller;

  const input: MintInterface = action.input;
  const target = input.target;

  ContractAssert(allowMinting, "Minting is not allowed for this token.");
  ContractAssert(caller === owner, "Caller is not the contract owner.");
  ContractAssert(
    /[a-z0-9_-]{43}/i.test(target),
    "Caller did not supply a valid target."
  );

  if (target in balances) {
    throw new ContractError("User already owns tokens.");
  }

  balances[target] = 1;

  return { ...state, balances };
};
