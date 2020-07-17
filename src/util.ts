import * as fs from 'fs';
import { homedir } from 'os';
import { promisify } from 'util';
import { parse, join, resolve } from 'path';
import { error } from './log';

export const write = promisify(fs.writeFile);
export const read = promisify(fs.readFile);

export const assert = (mix: unknown, msg: string) => !!mix || error(msg);
export const exists = (file: string, msg: string) =>  fs.existsSync(file) || error(msg);

export function list(str: Arrayable<string>): string[] {
	return Array.isArray(str) ? str : str.split(',');
}

export function load<T = unknown>(str: string, dir?: string): T | false {
	str = resolve(dir || '.', str);
	return fs.existsSync(str) && require(str);
}

export function toConfig(dir?: string): Config | void {
	type Pkg = { cfw?: Config };
	let tmp: Config | Pkg | false;
	if (tmp = load<Config>('cfw.js', dir)) return tmp;
	if (tmp = load<Config>('cfw.json', dir)) return tmp;
	if (tmp = load<Pkg>('package.json', dir)) return tmp.cfw;
}

export function toWorkerData(dir: string, name: string, isOne?: boolean): WorkerData {
	let abs = isOne ? dir : join(dir, name);
	let config = toConfig(abs) || {};
	return {
		cfw: config,
		name: config.name || name,
		input: join(abs, config.entry || 'index.js'),
		abs,
	};
}

export function toWorkers(dir: string, opts: Options): WorkerData[] {
	exists(dir, `Workers directory does not exist: "${dir}"`);

	let items: string[];
	let conf: Config | void;
	let { cwd, single, only, ignore } = opts;

	if (single) {
		let name = opts.dirname;
		if (name === '.') name = parse(cwd).base;
		let obj = toWorkerData(dir, name, true);
		// check for root config
		if (conf = toConfig(cwd)) {
			if (conf.name) obj.name = conf.name;
			Object.assign(obj.cfw, conf);
			if (opts.profile) obj.cfw.profile = opts.profile;
		}
		return [obj];
	}

	let arr = fs.readdirSync(dir).map(x => toWorkerData(dir, x));

	if (only) {
		items = list(only);
		return arr.filter(obj => items.includes(obj.name));
	}

	if (ignore) {
		items = list(ignore);
		return arr.filter(obj => !items.includes(obj.name));
	}

	return arr;
}

/**
 * Parse `~/.cfw/config` file.
 * Load a custom credentials `profile`
 */
async function toProfile(profile = 'default'): Promise<Partial<Profile>> {
	let file = join(homedir(), '.cfw', 'config');
	exists(file, `Missing "${file}" config file`);

	let data = await read(file, 'utf8');
	let arr = data.split(/\n+/g);
	let tmp: Partial<Profile>, map: Record<string, Partial<Profile>> = {};
	let i=0, name: string, rgx = /^\[(.*)\]$/;

	for (; i < arr.length; i++) {
		if (arr[i].startsWith('#') || !arr[i].trim().length) {
			// skip
		} else if (rgx.test(arr[i])) {
			name = rgx.exec(arr[i])[1];
			tmp = map[name] = {};
		} else {
			let [k, v] = arr[i].split(/\s*=\s*/);
			tmp[k as keyof Profile] = v;
		}
	}

	let out = map[profile];
	assert(out, `The "${profile}" profile is not defined`);
	return out;
}

export async function toCredentials(def: Config, loose?: boolean): Promise<Credentials> {
	let {
		CLOUDFLARE_ZONEID, CLOUDFLARE_ACCOUNTID,
		CLOUDFLARE_AUTH_EMAIL, CLOUDFLARE_AUTH_KEY, CLOUDFLARE_TOKEN
	} = process.env;

	let email = CLOUDFLARE_AUTH_EMAIL || def.email;
	let authkey = CLOUDFLARE_AUTH_KEY || def.authkey;
	let accountid = CLOUDFLARE_ACCOUNTID || def.accountid;
	let zoneid = CLOUDFLARE_ZONEID || def.zoneid;
	let token = CLOUDFLARE_TOKEN || def.token;

	let hasAuth = token || (authkey && email);

	// return early if all defined already
	if (hasAuth && accountid && zoneid) {
		return { authkey, accountid, email, token, zoneid };
	}

	if (def.profile) {
		let extra = await toProfile(def.profile);
		Object.keys(extra).forEach((key: keyof Profile) => {
			if (!email && /CLOUDFLARE_AUTH_EMAIL/i.test(key)) email = extra[key];
			if (!accountid && /CLOUDFLARE_ACCOUNTID/i.test(key)) accountid = extra[key];
			if (!authkey && /CLOUDFLARE_AUTH_KEY/i.test(key)) authkey = extra[key];
			if (!zoneid && /CLOUDFLARE_ZONEID/i.test(key)) zoneid = extra[key];
			if (!token && /CLOUDFLARE_TOKEN/i.test(key)) token = extra[key];
		});
	}

	assert(zoneid || loose, 'Missing Cloudflare "zoneid" value!');
	assert(accountid, 'Missing Cloudflare "accountid" value!');

	if (token || (authkey && email)) {
		// satisfactory
	} else if (authkey || email) {
		assert(email, 'Missing Cloudflare "email" value!');
		assert(authkey, 'Missing Cloudflare "authkey" value!');
	} else {
		error('Missing Cloudflare "token" value or "email" + "authkey" combo!');
	}

	return { authkey, accountid, email, token, zoneid };
}

export const rand = () => Math.random().toString(36).slice(2);

interface FormPart {
	value: string | Buffer;
	filename?: string;
	type?: string;
}

export function multipart(boundary: string, dict: Record<string, FormPart>): string {
	let key, tmp: FormPart, content = '';
	let NL = '\r\n', BOUND = '--' + boundary;

	for (key in dict) {
		tmp = dict[key];
		content += BOUND + NL;
		content += `Content-Disposition: form-data; name="${key}"`;
		if (tmp.filename) content += `; filename="${tmp.filename}"`;
		if (tmp.type) content += NL + `Content-Type: ${tmp.type}`;
		content += NL + NL + tmp.value + NL;
	}

	return content + BOUND + '--';
}
