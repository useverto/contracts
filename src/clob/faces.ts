export interface StateInterface {
  emergencyHaltWallet: string; // Wallet address to be used to halt contract in the event of an emergency
  halted: boolean;
  protocolFeePercent: number; // Percent of orders going to protocol
  pairGatekeeper: boolean; // Disable access to "addPair" to addresses without a Verto ID
  communityContract: string; // ID of the Verto community contract
  pairs: {
    pair: [string, string];
    priceLogs?: {
      orderID: string; // id of the last order made
      token: string; // id of the token that was sent in the last order made
      logs: PriceLogInterface[];
    };
    orders: OrderInterface[];
  }[];
  usedTransfers: string[]; // list of transfers that have already been used by an order
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
  orderID: string; // Transaction hash from the order creation contract interaction
}

export interface HaltInterface {
  function: "halt";
}

export interface TogglePairGatekeeperInterface {
  function: "togglePairGatekeeper";
}

export interface SetCommunityContractInterface {
  function: "setCommunityContract";
  id: string;
}

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

export interface ForeignTransferInterface
  extends Partial<ForeignTransferProps> {
  function: "foreignTransfer";
  transfers?: ForeignTransferProps[];
}

// Other interfaces

interface ForeignTransferProps {
  tokenID: string;
  target: string;
  qty: number;
}

export interface OrderInterface {
  id: string; // ID if the order transaction
  transfer: string; // ID of the token transfer
  creator: string;
  token: string; // the token the order is selling
  price: number;
  quantity: number;
  originalQuantity: number; // The original amount of tokens ordered
}

export interface ForeignCallInterface {
  txID: string;
  contract: string;
  input: InvocationInterface;
}

export interface InvocationInterface {
  function: string;
  [key: string | number]: any;
}

export interface PriceLogInterface {
  id: string; // order ID that matched with the last order
  price: number; // the price the token was bought at
  qty: number; // qty that the user got in return for their order
}
