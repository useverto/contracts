export interface StateInterface {
  name: string;
  ticker: string;
  title: string;
  description: string;
  owner: string;
  allowMinting: boolean;

  balances: { [address: string]: number };

  contentType: string;
  createdAt: string;
}

export interface ActionInterface {
  input: any;
  caller: string;
}

export interface BalanceInterface {
  function: "balance";
  target?: string;
}

export interface TransferInterface {
  function: "transfer";
  target: string;
  qty: number;
}

export interface MintInterface {
  function: "mint";
  target: string;
}
