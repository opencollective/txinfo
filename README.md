# txinfo

Add metadata about a blockchain transaction or address using Nostr.

Local first, decentralized and censorship resistant.

### How does it work?

Every time you add metadata to a blockchain object (tx or address), it publishes a Nostr note (kind 1111) with the following tags:

```json
{
  "kind": 1111,
  "content": "Human readable description of the transaction", // plain text, no markdown
  "tags": [
    ["i", "<blockchain>:[<chain_id>:](tx|address):<tx_hash>|<address>", "https://etherscan.io/tx/<tx_hash>"], // root URL
    ["k", "<blockchain>:(tx|address)"], // the root kind
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

Where 
- `<blockchain>`: `bitcoin` or `ethereum` (feel free to make a pull request to add support for more chains, e.g. `solana`)
- `<chain_id>`: only required for ethereum to differentiate between all the EVM compatible chains. See chain id on [chainlist.org](https://chainlist.org/).

The frontend will automatically generate a new Nostr user unless a `nostr_nsec` key is present in the local storage (so if you want to use your own nsec, just enter `localStorage.setItem("nostr_nsec", nsec);` in the browser console).

For more explanation about the required attributes for the Nostr note, see [NIP-73](https://github.com/nostr-protocol/nips/blob/master/73.md).

To add metadata about an address:

```json
{
  "kind": 1111,
  "content": "Human readable description of the address", // plain text, no markdown
  "tags": [
    ["i", "<blockchain>:<chain_id>:address:<address>", "https://etherscan.io/address/<address>"], // URI
    ["k", "<blockchain>:address"], // kind
    ["t", "tag1"],
    ["t", "tag2"],
    // example of custom tags:
    ["name", "<name>"],
    ["about", "<about>"],
    ["picture", "<picture url>"],
    ["url", "<related url>", "<mimetype>"],
  ]
}
```

## How to integrate in your own app?

Take a look at [nostr-tools](https://github.com/nbd-wtf/nostr-tools).
You basically just need to subscribe to any URI of a given transaction, account address or token address (using the "i" tag). You will then receive all the notes from the relays related to that object.

See also this integration example: https://github.com/CommonsHub/token-bot/blob/main/src/lib/nostr.ts

## Installation

```
npm install
cp .env.example .env
vim .env // i.e. edit this file
npm run dev
```

You can create a free Etherscan api key on the etherscan website (one per chain).
Only required to speed up populating transactions (copy `.env.example` to `.env`).

## Frontend use

Within a `NostrProvider`

```
<NostrProvider>{children}</NostrProvider>
```

```
const { notesByURI, subscribeToNotesByURI, updateProfile } = useNostr();

const uris = [
  'ethereum:100:address:0x6fdf0aae33e313d9c98d2aa19bcd8ef777912cbf',
  'ethereum:100:tx:0x473193c3906e453f90b7b95dc490b40d76afa90adf4a98f239c7a8c8bf396e10'
];

subscribeToURI(uris);
```

### Publish metadata

```
const { publishMetadata } = useNostr();
```

(requires `localStorage.getItem("nostr_nsec");`)

```
const uri = uris[0];
const content = "address description";
const tags = [
  ["t", "multisig"],
  ["chain":"gnosis"],
  ["picture","https://citizenspring.earth/favicon.ico"]
]
publishMetadata(uri, { content, tags });
```

