import { ActionInterface, StateInterface } from "./faces";
import { List } from "./modules/list";
import { Unlist } from "./modules/unlist";

export async function handle(state: StateInterface, action: ActionInterface) {
  switch (action.input.function) {
    case "list":
      return { state: await List(state, action) };
    case "unlist":
      return { state: Unlist(state, action) };
  }
}
