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

  invocations: string[];
  foreignCalls: ForeignCallInterface[];
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

// FCP inputs

export interface InvokeInterface {
  function: "invoke";
  foreignContract: string;
  invocation: InvocationInterface;
}

export interface ReadOutboxInterface {
  function: "readOutbox";
  contract: string;
  id: string;
}

// FCP state interfaces

export interface ForeignCallInterface {
  txID: string;
  contract: string;
  input: InvocationInterface;
}

export interface InvocationInterface {
  function: string;
  [key: string | number]: any;
}
