export interface StateInterface {
  data: string;
  lastCaller: string;

  invocations: string[];
  foreignCalls: ForeignCallInterface[];
}

export interface ActionInterface {
  input: any;
  caller: string;
}

// Inputs

export interface UpdateDataInterface {
  function: "updateData";
  data: string;
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
