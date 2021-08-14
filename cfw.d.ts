type Builder = (config: import('esbuild').BuildOptions) => void;
type Globals = {
	[name: string]:
		| `KV:${string}`
		| `ENV:${string}`
		| `SECRET:${string}`
		| `WASM:${string}`
}

export interface Config {
	name?: string;
	entry?: string;
	zoneid?: string;
	profile?: string;
	subdomain?: boolean;
	routes?: string[];
	build?: Builder;
	globals?: Globals;
	module?: boolean;
	usage?: 'bundled' | 'unbound';
	// should not exist
	token?: string;
	accountid?: string;
	authkey?: string;
	email?: string;
}
