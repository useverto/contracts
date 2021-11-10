export interface StateInterface {
  tokens: {
    id: string;
    type: Token;
    // TODO: update this to hash instead of username
    lister: string;
    // TODO: Interface for "custom" type.
  }[];
}

export type Token = "community" | "art" | "collection" | "custom";

export interface ActionInterface {
  input: any;
  caller: string;
}

export interface ListInterface {
  function: "list";
  id: string;
  type: Token;
}

export interface UnlistInterface {
  function: "unlist";
  id: string;
}
