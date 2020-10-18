# cfw [![CI](https://github.com/lukeed/cfw/workflows/CI/badge.svg)](https://github.com/lukeed/cfw/actions) [![npm](https://badgen.now.sh/npm/v/cfw)](https://npmjs.org/package/cfw)

> A build and deploy utility for Cloudflare Workers.

---

<p align="center"><strong>WORK IN PROGRESS</strong></p>

<p align="center"><strong>Status:</strong> Functional, but incomplete.</p>

---

## Credentials

There are two approaches in providing `cfw` with a set of Cloudflare credentials:

### Persisted

Create a `~/.cfw/config` file, where `~` is that path to your home directory. Inside, you'll store your credentials under different "profile" namespaces. (If you're familiar, this is very similar to an AWS credentials file.) An example file may look like this:

```
[personal]
CLOUDFLARE_AUTH_EMAIL = hello@me.com
CLOUDFLARE_ACCOUNTID = ACCOUNTID_VALUE
CLOUDFLARE_AUTH_KEY = GLOBAL_API_KEY
```

In this case, we have a "personal" profile containing our personal account credentials, for example. You can define multiple credential groups by repeating this template as needed, using different profile names.

```sh
[personal]
CLOUDFLARE_AUTH_EMAIL = hello@me.com
# ...

[work]
CLOUDFLARE_AUTH_EMAIL = hello@company.com
# ...
```

Additionally, all credential key names may be lowercased.

***Default Profile***

If a profile named "default" exists, then `cfw` will auto-load that credentials group when no there is no profile configured.

***Selecting a Profile***

You may use a `profile` key inside your configuration file, or define `--profile` when running an `cfw` command.

<!-- Please see [`config.proile`](#TODO) for more information. -->

### Environment Variables

The same keys found within your credentials file may be used again as environment variables.

When defined, an environment variable takes priority over all other configuration avenues.


<!-- TODO: auth + email vs token -->

<!-- ## Configuration -->


## License

MIT © [Luke Edwards](https://lukeed.com)
