# txinfo

Add more information about a blockchain transaction or address using Nostr.

Local first, decentralized and censorship resistant.

Etherscan API key is only required for optimization (copy `.env.example` to `.env`).

### How does it work?

Just publish a kind 1111 note with the following tags:

```json
{
  "kind": 1111,
  "content": "Human readable description of the transaction", // plain text, no markdown
  "tags": [
    ["I", "<chain_id>:tx:<tx_hash>", "https://etherscan.io/tx/<tx_hash>"], // root URL
    ["K", "<chain_id>:tx"], // the root kind
    ["t", "tag1"],
    ["t", "tag2"],
    // example of custom tags:
    ["project", "<project name>"],
    ["category", "<category name>"],
    ["url", "<related url>", "<mimetype>"],
    ["invoice", "<url to invoice>", "<mimetype>"],
    ["vat", "<VAT percentage or absolute amount>"],
  ]
}
```

For more explanation about the required attributes, see https://github.com/nostr-protocol/nips/blob/master/22.md

To add metadata about an address:

```json
{
  "kind": 1111,
  "content": "Human readable description of the address", // plain text, no markdown
  "tags": [
    ["I", "<chain_id>:address:<address>", "https://etherscan.io/address/<address>"], // root URL
    ["K", "<chain_id>:address"], // the root kind
    ["t", "tag1"],
    ["t", "tag2"],
    // example of custom tags:
    ["type", "<EOA|contract|ERC20>"],
    ["name", "<name>"],
    ["about", "<about>"],
    ["picture", "<picture url>"],
    ["url", "<related url>", "<mimetype>"],
  ]
}
```

## Frontend use

Within a `NostrProvider`

```
<NostrProvider>{children}</NostrProvider>
```

const { notesByURI, subscribeToNotesByURI, updateProfile } = useNostr();

const uris = [
  '100:address:0x6fdf0aae33e313d9c98d2aa19bcd8ef777912cbf',
  '100:tx:0x473193c3906e453f90b7b95dc490b40d76afa90adf4a98f239c7a8c8bf396e10'
];

subscribeToURI(uris);


// Publish metadata
````
const { publishNote } = useNostr();
```

requires `localStorage.getItem("nostr_nsec");`

```
const uri = uris[0];
const content = "address description";
const tags = [
  ["t", "multisig"],
  ["chain":"gnosis"],
  ["picture","https://citizenspring.earth/favicon.ico"]
]
publishNote(uri, { content, tags });
```
