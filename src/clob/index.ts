import { StateInterface, ActionInterface } from "./faces";

import { TogglePairGatekeeper } from "./modules/togglePairGatekeeper";
import { SetCommunityContract } from "./modules/setCommunityContract";
import { ForeignTransfer } from "./modules/foreignTransfer";
import { CreateOrder } from "./modules/createOrder";
import { CancelOrder } from "./modules/cancelOrder";
import { ReadOutbox } from "./modules/readOutbox";
import { AddPair } from "./modules/addPair";
import { Halt } from "./modules/halt";

export async function handle(state: StateInterface, action: ActionInterface) {
  ContractAssert(
    !state.halted || action.input.function === "halt",
    "The contract is currently halted"
  );

  switch (action.input.function) {
    case "addPair":
      return { state: await AddPair(state, action) };

    case "createOrder":
      return await CreateOrder(state, action);

    case "cancelOrder":
      return { state: await CancelOrder(state, action) };

    case "readOutbox":
      return { state: await ReadOutbox(state, action) };

    case "togglePairGatekeeper":
      return { state: TogglePairGatekeeper(state, action) };

    case "setCommunityContract":
      return { state: SetCommunityContract(state, action) };

    case "foreignTransfer":
      return { state: ForeignTransfer(state, action) };

    case "halt":
      return { state: Halt(state, action) };

    default:
      throw new ContractError(`Invalid function: "${action.input.function}"`);
  }
}
