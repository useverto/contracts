import { ActionInterface, StateInterface, ReadOutboxInterface } from "../faces";
import { handle } from "../index";

export const ReadOutbox = async (
  state: StateInterface,
  action: ActionInterface
): Promise<StateInterface> => {
  const input: ReadOutboxInterface = action.input;
  const invocations = state.invocations;

  // Ensure that a contract ID is passed
  ContractAssert(!!input.contract, "Missing contract to invoke");

  // Read the state of the foreign contract
  const foreignState = await SmartWeave.contracts.readContractState(
    input.contract
  );

  // Check if the foreign contract supports the foreign call protocol and compatible with the call
  ContractAssert(
    !!foreignState.foreignCalls,
    "Contract is missing support for foreign calls"
  );
  ContractAssert(
    foreignState.foreignCalls[parseInt(input.id)].contract ===
      SmartWeave.contract.id,
    "This contract is not the target contract chosen in the invocation"
  );

  const invocation = foreignState.foreignCalls[input.id].input;
  const foreignCall = SmartWeave.transaction.id;

  // Check if it has already been invoked
  ContractAssert(
    !invocations.includes(foreignCall),
    "Contract invocation already exists"
  );

  // Adjust the action interface to point to this contract
  const foreignAction = {
    ...action,
    caller: input.contract,
    input: invocation
  };

  // Evaluate the state
  const resultState = await handle(state, foreignAction);

  // Push the invoked call
  invocations.push(foreignCall);

  return resultState;
};
