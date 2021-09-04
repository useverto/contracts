import { ActionInterface, StateInterface } from "../faces";

export const Halt = (state: StateInterface, action: ActionInterface) => {
  const caller = action.caller;

  ContractAssert(
    caller === state.emergencyHaltWallet,
    "Caller cannot halt or resume the protocol"
  );

  return { ...state, halted: !state.halted };
};
