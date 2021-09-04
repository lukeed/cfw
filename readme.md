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

```ini
[personal]
CLOUDFLARE_AUTH_EMAIL = hello@me.com
CLOUDFLARE_ACCOUNTID = ACCOUNTID_VALUE
CLOUDFLARE_AUTH_KEY = GLOBAL_API_KEY
CLOUDFLARE_ZONEID = ZONEID_VALUE
```

In this case, we have a "personal" profile containing our personal account credentials. You can define multiple credential groups by repeating this template as needed, using different profile names.

```ini
[personal]
CLOUDFLARE_AUTH_EMAIL = hello@me.com
# ...

[work]
CLOUDFLARE_AUTH_EMAIL = hello@company.com
# ...
```

Additionally, all credential key names may be lowercased.

***Default Profile***

If a profile named `[default]` exists, then `cfw` will auto-load that credentials group when no there is no profile configured.

***Selecting a Profile***

You may use a `profile` key inside your configuration file, or define `--profile` when running an `cfw` command.

<!-- Please see [`config.proile`](#TODO) for more information. -->

### Environment Variables

The same keys found within your credentials file may be used again as environment variables.

When defined, an environment variable takes priority over all other configuration avenues.

* `CLOUDFLARE_ACCOUNTID` – your account identifier; alias of `config.accountid`
* `CLOUDFLARE_AUTH_EMAIL` – your account email address; alias of `config.email`
* `CLOUDFLARE_AUTH_KEY` – your account's global API key; alias of `config.authkey`
* `CLOUDFLARE_ZONEID` – your domain/zone's identifier; alias of `config.zoneid`
* `CLOUDFLARE_TOKEN` – an API access token; alias of `config.token`

### Authentication

In order to successfull access your Cloudflare account's resources, you must satisfy the following requirements:

1. A `CLOUDFLARE_ACCOUNTID` (or `config.accountid`) is **always required**.

2. A valid token or key-pair; you have two options:
    1. A `CLOUDFLARE_TOKEN` (or `config.token`) containing a valid [API token](https://dash.cloudflare.com/profile/api-tokens). <br>_***(Recommended)*** Preferred solution, as this API token can be narrowly scoped and can be revoked at any time._

    2. A valid `CLOUDFLARE_AUTH_EMAIL` _and_ `CLOUDFLARE_AUTH_KEY` combination. <br>_This requires your Global API Key, which grants full access to all account resources._

3. A `CLOUDFLARE_ZONEID` is **only required if** you are not deploying to a `*.workers.dev` subdomain (via `config.subdomain`).

The following profiles represent valid combinations:

```ini
[recommended]
cloudflare_accountid = da32...
cloudflare_token = 78a...
# (optional) cloudflare_zoneid = b58...

[other]
cloudflare_accountid = da32...
cloudflare_auth_email = hello@example.com
cloudflare_auth_key = 62d...
# (optional) cloudflare_zoneid = b58...
```

<!-- TODO: auth + email vs token -->

<!-- ## Configuration -->


## License

MIT © [Luke Edwards](https://lukeed.com)
