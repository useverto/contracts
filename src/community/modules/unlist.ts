import { ActionInterface, StateInterface, UnlistInterface } from "../faces";

export const Unlist = (state: StateInterface, action: ActionInterface) => {
  const people = state.people;
  const tokens = state.tokens;
  const caller = action.caller;

  const input: UnlistInterface = action.input;
  const id = input.id;

  const index = tokens.findIndex((token) => token.id === id);
  ContractAssert(index > -1, "Token has not been listed.");

  const identity = people.find((user) =>
    user.addresses.find((address) => address === caller)
  );
  ContractAssert(identity, "Caller does not have an identity.");
  ContractAssert(
    tokens[index].lister === identity.username,
    "Caller is not the owner of the token."
  );

  tokens.splice(index, 1);
  return { ...state, tokens };
};
