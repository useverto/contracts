import { ActionInterface, ClaimInterface, StateInterface } from "../faces";

export const Claim = (state: StateInterface, action: ActionInterface) => {
  let people = state.people;
  const caller = action.caller;

  const input: ClaimInterface = action.input;
  const username = input.username;
  const name = input.name;
  const addresses = input.addresses || [];
  const image = input.image;
  const bio = input.bio;
  const links = input.links;

  // if the supplied addresses does not include the caller
  if (!addresses.includes(caller)) addresses.push(caller);

  ContractAssert(username, "Caller did not supply a valid username.");
  ContractAssert(name, "Caller did not supply a valid name.");

  const person = people.find((user) => user.username === username);

  // if the username exists, update it's data
  if (person) {
    ContractAssert(
      person.addresses.includes(caller),
      "Caller is not in the addresses of the supplied user."
    );

    // check if someone already added this address
    for (const addr of addresses)
      ContractAssert(
        !people.find(
          (user) =>
            user.addresses.includes(addr) && user.username !== person.username
        ),
        `Address ${addr} is already added to a user.`
      );

    people = [
      ...people.filter((user) => user.username !== username),
      {
        ...person,
        name,
        addresses,
        image,
        bio,
        links
      }
    ];
  } else {
    // check if someone already added this address
    for (const addr of addresses)
      ContractAssert(
        !people.find((user) => user.addresses.includes(addr)),
        `Address ${addr} is already added to a user.`
      );

    // push new user
    people.push({
      username,
      name,
      addresses,
      image,
      bio,
      links
    });
  }

  return { ...state, people };
};
