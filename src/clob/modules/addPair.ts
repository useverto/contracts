import { ActionInterface, StateInterface, AddPairInterface } from "../faces";
import { StateInterface as CommunityContractStateInterface } from "../../community/faces";
import { getContractID } from "../utils";

export const AddPair = async (
  state: StateInterface,
  action: ActionInterface
): Promise<StateInterface> => {
  const caller = action.caller;
  const input: AddPairInterface = action.input;

  const pairs = state.pairs;
  const communityContract = state.communityContract;
  const gatekeeperActive = state.pairGatekeeper;
  const newPair = input.pair;

  // Check if the pair length is valid
  ContractAssert(newPair.length === 2, "Invalid pair length. Should be 2");

  ContractAssert(
    newPair[0] !== getContractID() && newPair[1] !== getContractID(),
    "Cannot add self as a pair"
  );

  // Test that pairs are valid contract strings
  ContractAssert(
    /[a-z0-9_-]{43}/i.test(newPair[0]) && /[a-z0-9_-]{43}/i.test(newPair[1]),
    "One of two supplied pairs is invalid"
  );

  // Read the community contract's state
  // If this fails, make sure to check if the community contract ID is valid
  const communityState: CommunityContractStateInterface =
    await SmartWeave.contracts.readContractState(communityContract);

  // Check if the tokens in the pair are listed on Verto
  ContractAssert(
    !!communityState.tokens.find(({ id }) => id === newPair[0]),
    `${newPair[0]} is not listed on Verto`
  );
  ContractAssert(
    !!communityState.tokens.find(({ id }) => id === newPair[1]),
    `${newPair[1]} is not listed on Verto`
  );

  // If the gatekeeper is active, check if the caller has a Verto ID
  if (gatekeeperActive) {
    ContractAssert(
      !!communityState.people.find((person) =>
        person.addresses.includes(caller)
      ),
      "No Verto ID linked to this address"
    );
  }

  // Test that pair is a valid contract
  for (const id of newPair) {
    try {
      // Pull the latest contract state
      const tokenState = await SmartWeave.contracts.readContractState(id);
      // Ensure contract has ticker and balances
      ContractAssert(
        tokenState?.ticker && tokenState?.balances,
        "Contract is not a valid token"
      );
      // Ensure contract has a valid ticker
      ContractAssert(
        typeof tokenState.ticker === "string",
        "Contract ticker is not a string"
      );
      // Check each address in the balances object
      for (const addr in tokenState.balances) {
        ContractAssert(
          typeof tokenState.balances[addr] === "number",
          `Invalid balance for "${addr}" in contract "${id}"`
        );
      }
      // Check if the token is tradeable
      // The owner of the contract can define this
      // at "state.settings", with the setting name
      // isTradeable
      const tradeableSetting = tokenState?.settings?.find(
        ([settingName]) => settingName === "isTradeable"
      )?.[1];

      ContractAssert(
        tradeableSetting === true || tradeableSetting === undefined,
        `This token does not allow trading (${id})`
      );

      // Check if the token supports the foreign call protocol
      // (has the foreignCalls and the invocations array)
      ContractAssert(
        !!tokenState.invocations,
        'Contract does not have an "invocations" filed, making it incompatible with FCP'
      );
      ContractAssert(
        !!tokenState.foreignCalls,
        'Contract does not have an "foreignCalls" filed, making it incompatible with FCP'
      );
    } catch (e) {
      throw new ContractError(e);
    }
  }

  // Test if pair already exists
  ContractAssert(
    !pairs.find(
      ({ pair: existingPair }) =>
        existingPair.includes(newPair[0]) && existingPair.includes(newPair[1])
    ),
    "This pair already exists"
  );

  state.pairs.push({
    pair: newPair,
    orders: []
  });

  return state;
};
