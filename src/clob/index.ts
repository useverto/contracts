import { StateInterface, ActionInterface } from "./faces";
import { Halt } from "./modules/halt";
import { AddPair } from "./modules/addPair";
import { CreateOrder } from "./modules/createOrder";
import { CancelOrder } from "./modules/cancelOrder";
import { ReadOutbox } from "./modules/readOutbox";
import { Invoke } from "./modules/invoke";
import { TogglePairGatekeeper } from "./modules/togglePairGatekeeper";

export async function handle(state: StateInterface, action: ActionInterface) {
  ContractAssert(
    !state.halted || action.input.function === "halt",
    "The contract is currently halted"
  );

  switch (action.input.function) {
    case "addPair":
      return { state: await AddPair(state, action) };

    case "createOrder":
      return { result: await CreateOrder(state, action) };

    case "cancelOrder":
      return { state: await CancelOrder(state, action) };

    case "readOutbox":
      return { state: await ReadOutbox(state, action) };

    case "invoke":
      return { state: Invoke(state, action) };

    case "togglePairGatekeeper":
      return { state: TogglePairGatekeeper(state, action) };

    case "halt":
      return { state: Halt(state, action) };

    default:
      throw new ContractError(`Invalid function: "${action.input.function}"`);
  }
}
