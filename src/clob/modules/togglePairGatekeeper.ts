import { ActionInterface, StateInterface } from "../faces";

export const TogglePairGatekeeper = (
  state: StateInterface,
  action: ActionInterface
): StateInterface => {
  const caller = action.caller;

  // Ensure that only the emergency wallet has access to this function
  ContractAssert(
    caller === state.emergencyHaltWallet,
    "Caller cannot toggle the gatekeeper"
  );

  return { ...state, pairGatekeeper: !state.pairGatekeeper };
};
