import {
  ActionInterface,
  StateInterface,
  ForeignTransferInterface
} from "../faces";

export const ForeignTransfer = (
  state: StateInterface,
  action: ActionInterface
): StateInterface => {
  const caller = action.caller;
  const input: ForeignTransferInterface = action.input;

  // Ensure that only the emergency wallet has access to this function
  ContractAssert(
    caller === state.emergencyHaltWallet,
    "Caller cannot issue a foreign transfer"
  );

  // Check params
  ContractAssert(
    input.qty && !!input.target && !!input.tokenID,
    "Missing parameters"
  );

  // Issue the transfer
  state.foreignCalls.push({
    txID: SmartWeave.transaction.id,
    contract: input.tokenID,
    input: {
      function: "transfer",
      target: input.target,
      qty: input.qty
    }
  });

  return state;
};
