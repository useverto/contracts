export interface StateInterface {
  emergencyHaltWallet: string; // Wallet address to be used to halt contract in the event of an emergency
  halted: boolean;
  // TODO: fees
  protocolFeePercent: number; // Percent of orders going to protocol
  pairGatekeeper: boolean; // Disable access to "addPair" to addresses without a Verto ID
  communityContract: string; // ID of the Verto community contract
  pairs: {
    pair: [string, string];
    priceData?: PriceDataInterface;
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

interface PriceDataInterface {
  // the id of the token from the pair
  // the price is calculated for
  // "x something / 1 dominantToken"
  dominantToken: string;
  // the block the order was created in
  block: number;
  // volume weighted average price, in
  // "x something / 1 dominantToken"
  vwap: number;
  // logs for this order's matches
  matchLogs: MatchLogs;
}

export type MatchLogs = {
  // the id the order matches with
  id: string;
  // the matched quantity
  qty: number;
  // the price the order matched at
  // in "x something / 1 dominantToken"
  price: number;
}[];

export type TagsArray = {
  name: string;
  value: string | string[];
}[];
