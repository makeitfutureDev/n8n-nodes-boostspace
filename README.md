# n8n-nodes-boostspace

This is an n8n community node for [Boost.space](https://boost.space) — a data synchronization and management platform. It lets you manage records, spaces, custom modules, and fields, and react to Boost.space events in your [n8n](https://n8n.io) workflows.

[Installation](#installation) · [Credentials](#credentials) · [Operations](#operations) · [Resources](#resources)

## Installation

Follow the [installation guide for community nodes](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n documentation:

1. In n8n, go to **Settings → Community Nodes**.
2. Select **Install** and enter `n8n-nodes-boostspace`.
3. Agree to the risks of using community nodes and select **Install**.

## Credentials

The node authenticates against the Boost.space API with:

- **API Token** — create one in your Boost.space account; see [token creation](https://docs.boost.space/knowledge-base/system/connections/token-creation/).
- **System Key** — the subdomain of your Boost.space system (`https://<system-key>.boost.space`).

## Operations

### Boost.space node

| Resource | Operations |
| --- | --- |
| Record | Create, Create Bulk, Get, Get Many, Get by Remote ID, Update, Sync, Delete |
| Space | Get, Get Many |
| Custom Module | Create, Get, Get Many, Update, Delete |
| Field | Create, Get Many, Update, Delete |
| API Call | Make a custom authenticated request to any Boost.space API endpoint |

### Boost.space Trigger node

Starts a workflow when a Boost.space event occurs:

- Record Created / Updated / Deleted (or any of the three)
- Module Created / Updated / Deleted (or any of the three)

## Compatibility

Requires n8n version 1.0 or newer.

## Resources

- [Boost.space documentation](https://docs.boost.space)
- [n8n community nodes documentation](https://docs.n8n.io/integrations/community-nodes/)

## License

[MIT](LICENSE.md)
