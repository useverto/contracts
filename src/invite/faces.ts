export interface StateInterface {
  name: string;
  ticker: string;
  description: string;
  owner: string;

  balances: { [address: string]: number };
  invites: { [address: string]: number };
}

export interface ActionInterface {
  input: any;
  caller: string;
}

// Module Faces

export interface BalanceInterface {
  function: "balance";
  target?: string;
}

export interface InviteInterface {
  function: "invite";
  target: string;
}

export interface MintInterface {
  function: "mint";
  target: string;
}

export interface TransferInterface {
  function: "transfer";
  target: string;
  qty: number;
}
