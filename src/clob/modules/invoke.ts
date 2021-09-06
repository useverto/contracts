import { ActionInterface, StateInterface, InvokeInterface } from "../faces";

export const Invoke = async (
  state: StateInterface,
  action: ActionInterface
): Promise<StateInterface> => {
  const input: InvokeInterface = action.input;

  // Ensure that the interaction has an invocation object
  ContractAssert(!!input.invocation, "Missing function invocation");

  // Ensure that the interaction has a foreign contract ID
  ContractAssert(!!input.foreignContract, "Missing foreign contract ID");

  // Push call to foreignCalls
  state.foreignCalls.push({
    txID: SmartWeave.transaction.id,
    contract: input.foreignContract,
    input: input.invocation,
  });

  return state;
};
