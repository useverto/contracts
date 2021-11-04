import {
  ActionInterface,
  StateInterface,
  ReadOutboxInterface,
  ForeignCallInterface
} from "../faces";
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

  // Get foreign calls for this contract
  const calls = foreignState.foreignCalls.filter(
    (element: ForeignCallInterface) =>
      element.contract === SmartWeave.contract.id &&
      state.invocations.includes(element.txID)
  );

  // https://www.notion.so/verto/Foreign-Call-Protocol-Specification-61e221e5118a40b980fcaade35a2a718#234abe5aa984441c83fbeb304147e885
  // Run all invocations
  let res = state;
  for (const entry of calls) {
    // TODO: why do we need this? @t8
    res = (await handle(res, { caller: input.contract, input: entry.input }))
      .state;
  }

  // Check if the invocation's target is this contract
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
  const { state: resultState } = await handle(state, foreignAction);

  // Push the invoked call
  invocations.push(foreignCall);

  return resultState;
};
