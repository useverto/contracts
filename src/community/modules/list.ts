import { Tag } from "arweave/node/lib/transaction";
import { ActionInterface, ListInterface, StateInterface } from "../faces";

export const List = async (state: StateInterface, action: ActionInterface) => {
  const people = state.people;
  const tokens = state.tokens;
  const caller = action.caller;

  const input: ListInterface = action.input;
  const id = input.id;
  const type = input.type;

  ContractAssert(
    /[a-z0-9_-]{43}/i.test(id),
    "Caller did not supply a valid token ID."
  );
  ContractAssert(
    type === "art" ||
      type === "community" ||
      type === "collection" ||
      type === "custom",
    "Caller did not supply a valid token type."
  );

  // check if the contract exists
  try {
    const { state: contractState, initTx } = await getInitialState(id);

    ContractAssert(!!contractState, "Contract state is null.");

    // if it is a token, ensure that it is valid
    if (type === "art" || type === "community") {
      ContractAssert(
        !!contractState.balances,
        "Contract does not have a balances object."
      );
      ContractAssert(
        contractState.name && contractState.ticker,
        "Contract does not have a name or a ticker."
      );
    }

    // check if a contract is an NFT
    const isNFT =
      Object.values(contractState.balances).reduce(
        (a: number, b: number) => a + b
      ) === 1;

    // check for tokens if the minter (author of contract init tx)
    // is the lister
    // TODO: check for communities if the lister has voting power for the community instead
    const minter = initTx.owner;

    if (!isNFT) {
      ContractAssert(
        caller === minter,
        "Caller is not the minter of the token."
      );
    } else {
      // if NFT, allow the current owner of the NFT to list it as well
      const currentOwner = Object.keys(contractState.balances).find(
        (addr) => contractState.balances[addr] > 0
      );

      ContractAssert(
        caller === minter || caller === currentOwner,
        "Caller is not the minter or the current owner of the token."
      );
    }
  } catch (e) {
    throw new ContractError("Contract does not exist.");
  }

  // TODO ANS
  const identity = people.find((user) =>
    user.addresses.find((address) => address === caller)
  );
  ContractAssert(!!identity, "Caller does not have an identity.");

  const token = tokens.find((item) => item.id === id);
  ContractAssert(!token, "Token has already been listed.");

  tokens.push({
    id,
    type,
    lister: identity.username
  });
  return { ...state, tokens };
};

async function getInitialState(contractID: string) {
  const contractTX = await SmartWeave.unsafeClient.transactions.get(contractID);

  if (getTagValue("Init-State", contractTX.tags))
    return {
      state: JSON.parse(getTagValue("Init-State", contractTX.tags)),
      initTx: contractTX
    };

  if (getTagValue("Init-State-TX", contractTX.tags))
    return {
      state: JSON.parse(
        (await SmartWeave.unsafeClient.transactions.getData(
          getTagValue("Init-State-TX", contractTX.tags),
          { decode: true, string: true }
        )) as string
      ),
      initTx: contractTX
    };

  return {
    state: JSON.parse(
      (await SmartWeave.unsafeClient.transactions.getData(contractID, {
        decode: true,
        string: true
      })) as string
    ),
    initTx: contractTX
  };
}

const getTagValue = (name: string, tags: Tag[]) =>
  tags.find((tag) => tag.name === name)?.value;
