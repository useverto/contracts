import { ActionInterface, StateInterface } from "./faces";
import { Transfer } from "./modules/transfer";
import { Balance } from "./modules/balance";
import { Mint } from "./modules/mint";
import { ReadOutbox } from "./modules/readOutbox";
import { Invoke } from "./modules/invoke";

export async function handle(state: StateInterface, action: ActionInterface) {
  switch (action.input.function) {
    case "transfer":
      return { state: Transfer(state, action) };

    case "balance":
      return { result: Balance(state, action) };

    case "mint":
      return { state: Mint(state, action) };

    // FCP
    case "readOutbox":
      return { state: await ReadOutbox(state, action) };

    case "invoke":
      return { state: await Invoke(state, action) };

    default:
      throw new ContractError(`Invalid function: "${action.input.function}"`);
  }
}
