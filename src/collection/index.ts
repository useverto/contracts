import { ActionInterface, StateInterface } from "./faces";
import { UpdateCollaborators } from "./modules/collaborators";
import { UpdateDetails } from "./modules/details";
import { UpdateItems } from "./modules/items";

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
  }
}
