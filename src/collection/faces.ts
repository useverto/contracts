export interface StateInterface {
  name: string;
  description: string;
  owner: string; // contract deployer
  collaborators: string[]; // addresses that can edit this collection
  items: string[]; // id of the tokens in the collection
  invocations: string[];
  foreignCalls: ForeignCallInterface[];
}

export interface ActionInterface {
  input: any;
  caller: string;
}

// Inputs

export interface UpdateItemsInterface {
  function: "updateItems";
  items: string[]; // new list of items
}

export interface UpdateDetailsInterface {
  function: "updateDetails";
  name: string;
  description: string;
}

export interface UpdateCollaboratorsInterface {
  function: "updateCollaborators";
  collaborators: string[];
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
