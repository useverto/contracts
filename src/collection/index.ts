import { ActionInterface, StateInterface } from "./faces";
import { UpdateCollaborators } from "./modules/collaborators";
import { UpdateDetails } from "./modules/details";
import { Invoke } from "./modules/invoke";
import { UpdateItems } from "./modules/items";
import { ReadOutbox } from "./modules/readOutbox";

export async function handle(state: StateInterface, action: ActionInterface) {
  switch (action.input.function) {
    // Update details
    case "updateDetails":
      return { state: UpdateDetails(state, action) };

    // collaborators
    case "updateCollaborators":
      return { state: UpdateCollaborators(state, action) };

    // Edit items
    case "updateItems":
      return { state: UpdateItems(state, action) };

    // FCP
    case "readOutbox":
      return { state: await ReadOutbox(state, action) };

    case "invoke":
      return { state: await Invoke(state, action) };

    default:
      throw new ContractError(`Invalid function: "${action.input.function}"`);
  }
}
