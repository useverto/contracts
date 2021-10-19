/**
 * Ensures that the interaction tx is a valid transfer transaction
 *
 * @param tokenID The contract ID of the transferred token
 * @param transferTx The ID of the transfer interaction transaction
 * @param contractID The ID of this contract
 */
export const ensureValidTransfer = async (
  tokenID: string,
  transferTx: string
) => {
  // Test tokenTx for valid contract interaction
  await ensureValidInteraction(tokenID, transferTx);

  try {
    const tx = await SmartWeave.unsafeClient.transactions.get(transferTx);

    // @ts-ignore
    tx.get("tags").forEach((tag) => {
      if (tag.get("name", { decode: true, string: true }) === "Input") {
        const input = JSON.parse(
          tag.get("value", { decode: true, string: true })
        );

        // Check if the interaction is a transfer
        ContractAssert(
          input.function === "transfer",
          "The interaction is not a transfer"
        );

        // make sure that the target of the transfer transaction is THIS (the clob) contract
        ContractAssert(
          input.target ===
            // @ts-expect-error
            SmartWeave.transaction.tags.find(({ name }) => name === "Contract")
              .value,
          "The target of this transfer is not this contract"
        );
      }
    });
  } catch (err) {
    throw new ContractError(err);
  }
};

/**
 * Ensures that the interaction is valid
 *
 * @param contractID The contract ID to match the interaction with
 * @param interactionID The ID of the interaction to check
 */
export const ensureValidInteraction = async (
  contractID: string,
  interactionID: string
) => {
  const {
    validity: contractTxValidities
    // @ts-ignore
  } = await SmartWeave.contracts.readContractState(contractID, undefined, true);

  // The interaction tx of the token somewhy does not exist
  ContractAssert(
    interactionID in contractTxValidities,
    "The interaction is not associated with this contract"
  );

  // Invalid transfer
  ContractAssert(
    contractTxValidities[interactionID],
    "The interaction was invalid"
  );
};

/**
 * Returns if a string is a valid Arweave address or ID
 *
 * @param addr String to validate
 *
 * @returns Valid address or not
 */
export const isAddress = (addr: string) => /[a-z0-9_-]{43}/i.test(addr);
