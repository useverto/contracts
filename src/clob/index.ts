import { StateInterface, ActionInterface } from "./faces";
import { Halt } from "./modules/halt";
import { AddPair } from "./modules/addPair";
import { CreateOrder } from "./modules/createOrder";
import { CancelOrder } from "./modules/cancelOrder";

export async function handle(state: StateInterface, action: ActionInterface) {
  switch (action.input.function) {
    case "addPair":
      ContractAssert(!state.halted, "The contract is currently halted");
      return { state: await AddPair(state, action) };

    case "createOrder":
      ContractAssert(!state.halted, "The contract is currently halted");
      return { result: await CreateOrder(state, action) };

    case "cancelOrder":
      ContractAssert(!state.halted, "The contract is currently halted");
      return { state: CancelOrder(state, action) };

    case "halt":
      return { state: Halt(state, action) };

    default:
      throw new ContractError(`Invalid function: "${action.input.function}"`);
  }
}
