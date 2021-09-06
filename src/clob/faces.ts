export interface StateInterface {
  emergencyHaltWallet: string; // Wallet address to be used to halt contract in the event of an emergency
  halted: boolean;
  protocolFeePercent: number; // Percent of orders going to protocol
  pairGatekeeper: boolean; // Disable access to "addPair" to addresses without a Verto ID
  communityContract: string; // ID of the Verto community contract
  pairs: [
    {
      pair: [string, string];
      orders: OrderInterface[];
    }
  ];
  invocations: string[];
  foreignCalls: ForeignCallInterface[];
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

export interface SetCommunityContractInterface {
  function: "setCommunityContract";
  id: string;
}

export interface InvokeInterface {
  function: "invoke";
  foreignContract: string;
  invocation: object;
}

export interface ReadOutboxInterface {
  function: "readOutbox";
  contract: string;
  id: string;
}

// Other interfaces

export interface OrderInterface {
  transaction: string;
  creator: string;
  token: string;
  price: number;
  quantity: number;
  originalQuantity: number; // The original amount of tokens ordered
}

export interface ForeignCallInterface {
  contract: string;
  input: object;
}
