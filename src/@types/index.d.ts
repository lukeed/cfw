type Arrayable<T> = T | T[];
type Nullable<T> = T | null;

// ---

type Builder = (config: import('esbuild').BuildOptions) => void;
type Globals = {
	[name: string]:
		| `KV:${string}`
		| `ENV:${string}`
		| `SECRET:${string}`
		| `WASM:${string}`
}

interface Config {
	name?: string;
	entry?: string;
	zoneid?: string;
	profile?: string;
	routes?: string[];
	build?: Builder;
	globals?: Globals;
	// should not exist
	token?: string;
	accountid?: string;
	authkey?: string;
	email?: string;
}

interface WorkerData {
	input: string;
	name: string;
	abs: string;
	cfw: Partial<Config>;
}

interface Options {
	cwd: string;
	/** Name of source directory */
	dir: string;
	single?: boolean;
	profile?: string;
	ignore?: Arrayable<string>;
	only?: Arrayable<string>;
}

interface Profile {
	cloudflare_auth_key: string;
	cloudflare_auth_email: string;
	cloudflare_accountid: string;
	cloudflare_zoneid?: string;
}

interface Credentials {
	/** Target Zone ID */
	zoneid: string;
	/** Target Account ID */
	accountid: string;
	/** An API token; required if `authkey` and `email` are missing. */
	token?: string;
	/** Account authorization key; required if `token` is missing. */
	authkey?: string;
	/** Account email address; required if `token` is missing. */
	email?: string;
}
