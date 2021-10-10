import {
  ActionInterface,
  UpdateDetailsInterface,
  StateInterface
} from "../faces";

export const UpdateDetails = (
  state: StateInterface,
  action: ActionInterface
) => {
  const collaborators = state.collaborators;

  const input: UpdateDetailsInterface = action.input;
  const caller = action.caller;

  ContractAssert(
    collaborators.includes(caller),
    "Caller not in collaborators."
  );

  return {
    ...state,
    name: input.name ?? state.name,
    description: input.description ?? state.description
  };
};
