import { ActionInterface, StateInterface, AddPairInterface } from "../faces";

export const AddPair = async (
  state: StateInterface,
  action: ActionInterface
) => {
  const caller = action.caller;
  const input: AddPairInterface = action.input;

  const pairs = state.pairs;
  const newPair = input.pair;

  // Test that pairs are valid contract strings
  ContractAssert(
    /[a-z0-9_-]{43}/i.test(newPair[0]) && /[a-z0-9_-]{43}/i.test(newPair[1]),
    "One of two supplied pairs is invalid"
  );

  // Test that pair is a valid contract
  for (const id of newPair) {
    try {
      // Pull the latest contract state
      const tokenState = await SmartWeave.contracts.readContractState(id);
      // Ensure contract has ticker and balances
      ContractAssert(
        tokenState?.ticker && tokenState?.balances,
        "Contract is not a valid token"
      );
      // Ensure contract has a valid ticker
      ContractAssert(
        typeof tokenState.ticker === "string",
        "Contract ticker is not a string"
      );
      // Check each address in the balances object
      for (const addr in tokenState.balances) {
        ContractAssert(
          typeof tokenState.balances[addr] === "number",
          `Invalid balance for "${addr}" in contract "${id}"`
        );
      }
    } catch (e) {
      throw new ContractError(e);
    }
  }

  // Test if pair already exists
  for (let i = 0; i < pairs.length; i++) {
    const currentPair = pairs[i].pair;
    ContractAssert(
      !currentPair.includes(newPair[0]) && !currentPair.includes(newPair[1]),
      "This pair already exists"
    );
  }

  state.pairs.push({
    pair: newPair,
    orders: [],
  });
  return { ...state };
};
