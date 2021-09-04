export interface StateInterface {
  emergencyHaltWallet: string; // Wallet address to be used to halt contract in the event of an emergency
  halted: boolean;
  protocolFeePercent: number; // Percent of orders going to protocol
  pairs: [
    {
      pair: [string, string];
      orders: [
        {
          transaction: string;
          creator: string;
          token: string;
          price: number;
        }?
      ];
    }
  ];
  invocations: string[];
  foreignCalls: {
    contract: string;
    input: object;
  }[];
}

export interface ActionInterface {
  input: any;
  caller: string;
}

export interface AddPairInterface {
  function: "addPair";
  pair: [string, string]; // Pair that the user wants to initialize
}

export interface CreateOrderInterface {
  function: "createOrder";
  transaction: string; // Transaction hash from the token transfer to this contract
  pair: [string, string]; // Pair that user is trading between
  price?: number; // Price of token being sent (optional)
}

export interface CancelOrderInterface {
  function: "cancelOrder";
  transaction: string; // Transaction hash from the order creation contract interaction
}

export interface HaltInterface {
  function: "halt";
}

export interface InvokeInterface {
  function: "invoke";
  foreignContract: string;
  invocation: object;
}

export interface ReadOutboxInterface {
  function: "readOutbox";
  contract: string;
}
