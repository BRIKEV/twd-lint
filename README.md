# twd-lint

Catch [TWD](https://github.com/BRIKEV/twd) test mistakes while you write them,
in the editor and in CI, instead of in a failing browser run.

TWD tests run in the browser. A forgotten `await` or a wrong import is only
found after starting the dev server, running the suite and reading the failure.
That is slow for a person and expensive for an AI agent, which spends a full run
to learn it forgot an `await`. Most of these mistakes are visible in the source,
so a linter can report them in a second, and fix many of them for you.

twd-lint works two ways:

- **a command**, `npx twd-lint`, that needs no setup at all;
- **an ESLint plugin**, for projects that already use ESLint.

Both run the same rules. Requires Node 20 or later.

## Command line

```bash
npx twd-lint                     # every *.twd.test.* file in the current folder
npx twd-lint src/twd-tests       # a folder
npx twd-lint src/a.twd.test.ts   # specific files
npx twd-lint --fix               # apply the safe fixes, then report what is left
npx twd-lint --format json       # machine-readable output, for tools and AI agents
```

It needs no ESLint installed and no config file, and it ignores the project's
own ESLint config, so it gives the same result in every project, whatever
linter the project uses (ESLint, Biome, oxlint or none).

| Exit code | Meaning |
|---|---|
| `0` | No problems |
| `1` | Problems found |
| `2` | Usage error, or no TWD test files to lint |

To pin a version, install it: `npm install --save-dev twd-lint`, then
`npx twd-lint` uses the installed one.

## ESLint plugin

```bash
npm install --save-dev twd-lint
```

Requires ESLint 9 or 10 (flat config). Add the recommended config to your
`eslint.config.js`:

```js
import twd from 'twd-lint'

export default [
  // ...your own config
  twd.configs.recommended,
]
```

That is all. `recommended`:

- applies to `**/*.twd.test.{ts,tsx,js,jsx}` only, so it never touches app code
  or your Vitest/Jest tests;
- brings its own TypeScript parser for those files, so it works in JavaScript
  projects and in projects without TypeScript set up in ESLint;
- parses with its own TypeScript 6, whatever version your project uses: it
  works in TypeScript 7 projects too, which typescript-eslint does not support
  yet;
- turns on every rule below as an error.

To pick rules yourself instead:

```js
import twd from 'twd-lint'

export default [
  {
    files: ['**/*.twd.test.ts'],
    plugins: { twd },
    rules: {
      'twd/no-missing-await': 'error',
    },
  },
]
```

## Rules

🔧 fixable with `--fix`

| Rule | What it reports | 🔧 |
|---|---|---|
| [`twd/no-missing-await`](docs/rules/no-missing-await.md) | An async TWD call (`twd.visit`, `userEvent.click`, `screenDom.findBy*`, …) that is not awaited | 🔧 |
| [`twd/runner-imports`](docs/rules/runner-imports.md) | `describe`/`it`/hooks/`expect` imported from Vitest, Jest, Mocha, `node:test` or `chai`, or from the wrong TWD module | 🔧 |
| [`twd/no-request-body`](docs/rules/no-request-body.md) | `rule.request.body` on a `waitForRequest` result: `rule.request` already is the body | |
| [`twd/no-focused-tests`](docs/rules/no-focused-tests.md) | `it.only` / `describe.only` left behind | |

The autofix for `no-missing-await` is applied only inside an `async` function,
where adding `await` is always valid.

### Examples

```ts
// ❌ reported
import { describe, it, expect } from 'vitest'          // runner-imports
import { twd, screenDom } from 'twd-js'

describe('Todos', () => {
  it.only('creates a todo', async () => {               // no-focused-tests
    twd.visit('/todos')                                 // no-missing-await
    const rule = await twd.waitForRequest('create')
    expect(rule.request.body.title).to.equal('A')       // no-request-body
  })
})
```

```ts
// ✅ clean
import { twd, expect, screenDom } from 'twd-js'
import { describe, it } from 'twd-js/runner'

describe('Todos', () => {
  it('creates a todo', async () => {
    await twd.visit('/todos')
    const rule = await twd.waitForRequest('create')
    expect(rule.request.title).to.equal('A')
  })
})
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). The repo includes an
[example app](example/) with correct TWD tests and a
[lint playground](example/lint-playground/) with one mistake per rule, for
trying rules in the editor.

## License

[MIT](LICENSE) © BRIKEV
