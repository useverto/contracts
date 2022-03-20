import { ActionInterface, StateInterface } from "./faces";
import { UpdateData } from "./modules/updateData";
import { Invoke } from "./modules/invoke";
import { ReadOutbox } from "./modules/readOutbox";

export async function handle(state: StateInterface, action: ActionInterface) {
  switch (action.input.function) {
    case "updateData":
      return { state: UpdateData(state, action) };

    // FCP
    case "readOutbox":
      return { state: await ReadOutbox(state, action) };

    case "invoke":
      return { state: await Invoke(state, action) };

    default:
      throw new ContractError(`Invalid function: "${action.input.function}"`);
  }
}
