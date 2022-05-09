# contracts

The Verto Protocol's smart contracts for the SmartWeave protocol.

## CLOB contract

The CLOB contract is a smart contract that functions as a decentralized Central Limit Order Book.

[Link](src/clob/)

### Default state

```ts
{
  emergencyHaltWallet: "",
  halted: false,
  protocolFeePercent: 0.05,
  pairGatekeeper: false,
  communityContract: "",
  pairs: [],
  usedTransfers: [],
  invocations: [],
  foreignCalls: []
}
```
