import { ActionInterface, StateInterface } from "./faces";
import { Transfer } from "./modules/transfer";
import { Balance } from "./modules/balance";
import { Mint } from "./modules/mint";

export async function handle(state: StateInterface, action: ActionInterface) {
  switch (action.input.function) {
    case "transfer":
      return { state: Transfer(state, action) };

    case "balance":
      return { result: Balance(state, action) };

    case "mint":
      return { state: Mint(state, action) };

    default:
      throw new ContractError(`Invalid function: "${action.input.function}"`);
  }
}
