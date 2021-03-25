type Builder = (config: import('esbuild').BuildOptions) => void;
type Globals = Record<string, string>;

export interface Config {
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
