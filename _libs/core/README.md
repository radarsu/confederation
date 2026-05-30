# @puristic/env

**Type-safe configuration whose one Zod schema is the single source of truth — for runtime loading, CI validation, codegen, and a [VSCode editor](https://github.com/radarsu/puristic-env/tree/main/_libs/vscode).**

`@puristic/env` loads configuration by merging CLI flags, environment variables, and `.env` files with predictable precedence, validating them against a [Zod](https://zod.dev) schema, and decrypting any secrets — all driven by the *real* TypeScript schema your app already imports, not a separate DSL or a cloud API. The same definition powers the [`purenv` CLI](https://www.npmjs.com/package/@puristic/env-cli) and the VSCode extension, so they can never drift.

## Install

```sh
pnpm add @puristic/env   # or: npm i @puristic/env
```

Requires **Node 24+** and `zod` v4.

## Quickstart

Define your configuration once and export the **raw `ConfigDefinition`** (schema + sources) — not `loadConfig(...)`, which loads immediately and would fail on encrypted secrets without a key:

```ts
// env.config.ts — the single source of truth
import { type ConfigDefinition, envFile, env, cliArgs } from "@puristic/env/index.js";
import { z } from "zod";

export default {
    schema: z.object({
        nodeEnv: z.string(),
        server: z.object({
            port: z.coerce.number().int(),
            host: z.string().default("0.0.0.0"),
        }),
        database: z.object({
            url: z.url().meta({ secret: true }),
        }),
    }),
    sources: [envFile(".env"), env(), cliArgs()], // later sources win: CLI > env > .env file
} satisfies ConfigDefinition<z.ZodType>;
```

Load it at runtime — validated, secrets decrypted, deep-frozen:

```ts
import { loadConfig } from "@puristic/env/index.js";
import definition from "./env.config.js";

const config = loadConfig(definition);
config.server.port; // number
```

Use `createConfig(definition)` instead when you want a handle: call `.load()` once in your bootstrap, then `.get()` anywhere (it throws if accessed before `load()`).

Nested schema paths map to env var names by core's rule — `["server", "httpsPort"]` → `SERVER_HTTPS_PORT` (and `--server-https-port` for CLI flags):

```sh
# .env
NODE_ENV=production
SERVER_PORT=8080
DATABASE_URL=encrypted:v1:…        # secret — encrypted in place
```

## API

| Export | Purpose |
| --- | --- |
| `loadConfig` / `createConfig` | Load + validate + decrypt + deep-freeze (one-call, or a `load`/`get` handle) |
| `envFile` · `env` · `cliArgs` | Built-in sources, merged left-to-right with last-source-wins precedence |
| `extractDefinition` / `loadDefinition` | Resolve a `ConfigDefinition` from an imported / on-disk `env.config.*` |
| `inspectSchema` · `validateValues` · `classify` | Schema introspection, per-leaf validation, and the shared OK / Missing / Invalid / Unknown / secret status model |
| `encrypt` · `decrypt` · `generateKeypair` | Post-quantum secret encryption (ML-KEM-512 + AES-256-GCM) |
| `generateDts` · `generateEnvExample` · `generateJsonSchema` | Codegen from the schema (typed `process.env`, `.env.example`, JSON Schema) |
| `parseEnv` · `serializeEnv` · `setValue` … | Round-trip `.env` editing that preserves comments, order, quoting, and `export` prefixes |
| `expandEnv` / `expandValue` | `$VAR` / `${VAR}` expansion against sibling values and the ambient environment |

## Secrets

Mark a field secret with `.meta({ secret: true })`. Its value is encrypted **in place** with the project's public key (`.config/purenv-pub.key`) into an `encrypted:v1:…` envelope using **ML-KEM-512** (a post-quantum KEM) + **AES-256-GCM**. Encryption needs only the public key; loading/decrypting needs the private key. It is fully local — no cloud account. Generate a keypair with `purenv keygen`.

## Learn more

- **[Full project README](https://github.com/radarsu/puristic-env#readme)** — overview, security model, and getting started
- **[`@puristic/env-cli`](https://www.npmjs.com/package/@puristic/env-cli)** — the `purenv` command line
- **[VSCode extension](https://github.com/radarsu/puristic-env/tree/main/_libs/vscode)** — the schema-driven `.env` editor

## License

MIT
