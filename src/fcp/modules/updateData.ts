import { ActionInterface, StateInterface, UpdateDataInterface } from "../faces";

// demo function
export const UpdateData = (state: StateInterface, action: ActionInterface) => {
  const caller = action.caller;
  const input: UpdateDataInterface = action.input;

  state.data = input.data;
  state.lastCaller = caller;

  return state;
};
