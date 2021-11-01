# Examples

> WIP – more on the way~!

* **[`workers/basic`](/examples/workers/basic)**<br>_Quick start with two `GET` requests._
* **[`workers/static`](/examples/workers/static)**<br>_A static site, tied to a KV Namespace._
* **[`More examples`](https://github.com/lukeed/worktop/tree/master/examples)**<br>_Other examples available._

## Setup

***Installation***

> **Note:** You may skip this if you ran `pnpm install` from the project root.

```sh
$ pnpm install
# or
$ yarn install
# or
$ npm install
```

***Build***

> **Note:** Must be run from this (`/examples`) directory

```sh
$ pnpm run build
# or
$ yarn run build
# or
$ npm run build
```

***Deploy***

> **Important:** You must set up your `cfw` credentials and update all `workers/*/cfw.json` files.

```sh
$ pnpm run deploy
# or
$ yarn run deploy
# or
$ npm run deploy
```

## License

MIT
