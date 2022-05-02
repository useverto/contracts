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

  // multiple transfers mode
  if (input.transfers) {
    for (let i = 0; i < input.transfers.length; i++) {
      const transfer = input.transfers[i];

      // Check params
      ContractAssert(
        transfer.qty && !!transfer.target && !!transfer.tokenID,
        `Missing parameters for transfer #${i}`
      );

      // Issue the transfers
      state.foreignCalls.push({
        txID: SmartWeave.transaction.id,
        contract: transfer.tokenID,
        input: {
          function: "transfer",
          target: transfer.target,
          qty: transfer.qty
        }
      });
    }
  } else {
    // single transfer mode

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
  }

  return state;
};
