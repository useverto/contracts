import {
  ActionInterface,
  SetCommunityContractInterface,
  StateInterface
} from "../faces";
import { getContractID, isAddress } from "../utils";

export const SetCommunityContract = (
  state: StateInterface,
  action: ActionInterface
): StateInterface => {
  const caller = action.caller;
  const { id }: SetCommunityContractInterface = action.input;

  // Ensure that only the emergency wallet has access to this function
  ContractAssert(
    caller === state.emergencyHaltWallet,
    "Caller cannot set the community contract"
  );

  // Ensure that the contract is not this one
  ContractAssert(
    id !== getContractID(),
    "Cannot add self as community contract"
  );

  // Check if the supplied ID is valid
  ContractAssert(isAddress(id), "Invalid ID supplied");

  return { ...state, communityContract: id };
};
