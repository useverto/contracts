import {
  ActionInterface,
  UpdateCollaboratorsInterface,
  StateInterface
} from "../faces";

export const UpdateCollaborators = (
  state: StateInterface,
  action: ActionInterface
) => {
  const collaborators = state.collaborators;

  const input: UpdateCollaboratorsInterface = action.input;
  const caller = action.caller;
  const creator: string = state.owner; // TODO: fix this

  ContractAssert(
    collaborators.includes(caller),
    "Caller not in collaborators."
  );
  ContractAssert(
    caller === creator,
    "Only the collection's owner can manage the collaborators."
  );

  for (const addr of input.collaborators) {
    ContractAssert(/[a-z0-9_-]{43}/i.test(addr), `Invalid address ${addr}`);
  }

  // do not allow removing the creator
  ContractAssert(
    input.collaborators.includes(creator),
    "Cannot remove creator from collaborators."
  );

  return { ...state, collaborators: input.collaborators };
};
