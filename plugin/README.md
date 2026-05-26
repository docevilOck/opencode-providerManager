# @docevil/opencode-provider-manager

`@docevil/opencode-provider-manager` is an OpenCode TUI plugin that adds a `/provider` entry for inspecting and managing provider definitions and agent model bindings.

## Install

Add the package to your OpenCode config:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["@docevil/opencode-provider-manager"]
}
```

Restart OpenCode after changing the config.

## Usage

Open the TUI and run `/provider`.

Current implementation covers:

- provider list and edit flow
- provider connection test
- fetch model candidates
- set default provider
- agent model binding updates

## Local Development

```bash
npm install
npm test
npm run build
```

## Publish

```bash
npm version patch
npm publish
```

To appear in the public OpenCode ecosystem listing, publish the npm package first and then submit a PR to the OpenCode ecosystem page with the repository link and plugin description.
