export interface StateInterface {
  people: {
    username: string;
    name: string;
    addresses: string[];
    image?: string;
    bio?: string;
    links?: {
      [identifier: string]: string;
    };
  }[];

  tokens: {
    id: string;
    type: Token;
    lister: string;
    // TODO: Interface for "custom" type.
  }[];
}

export type Token = "community" | "art" | "collection" | "custom";

export interface ActionInterface {
  input: any;
  caller: string;
}

// TODO: Module Interfaces.

export interface ClaimInterface {
  function: "claim";
  username: string;
  name: string;
  addresses?: string[];
  image?: string;
  bio?: string;
  links?: {
    [identifier: string]: string;
  };
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
