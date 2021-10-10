import { ActionInterface, StateInterface } from "./faces";
import { Balance } from "./modules/balance";
import { Invite } from "./modules/invite";
import { Mint } from "./modules/mint";
import { Transfer } from "./modules/transfer";

export async function handle(state: StateInterface, action: ActionInterface) {
  switch (action.input.function) {
    // Token Functions
    case "transfer":
      return { state: Transfer(state, action) };

    case "balance":
      return { result: Balance(state, action) };

    // Custom Functions
    case "mint":
      return { state: Mint(state, action) };

    case "invite":
      return { state: Invite(state, action) };
  }
}
