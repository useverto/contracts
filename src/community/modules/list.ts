import { ActionInterface, ListInterface, StateInterface } from "../faces";

export const List = (state: StateInterface, action: ActionInterface) => {
  const people = state.people;
  const tokens = state.tokens;
  const caller = action.caller;

  const input: ListInterface = action.input;
  const id = input.id;
  const type = input.type;

  ContractAssert(
    /[a-z0-9_-]{43}/i.test(id),
    "Caller did not supply a valid token ID."
  );
  ContractAssert(
    type === "art" ||
      type === "community" ||
      type === "collection" ||
      type === "custom",
    "Caller did not supply a valid token type."
  );

  const identity = people.find((user) =>
    user.addresses.find((address) => address === caller)
  );
  ContractAssert(identity, "Caller does not have an identity.");

  const token = tokens.find((item) => item.id === id);
  ContractAssert(!token, "Token has already been listed.");

  tokens.push({
    id,
    type,
    lister: identity.username
  });
  return { ...state, tokens };
};
