import * as fs from 'fs';
import { homedir } from 'os';
import { promisify } from 'util';
import { createRequire } from 'module';
import { parse, join, resolve } from 'path';
import { error } from './log';

export const write = promisify(fs.writeFile);
export const read = promisify(fs.readFile);
export const rmdir = promisify(fs.rmdir);
export const ls = promisify(fs.readdir);

export const exists = fs.existsSync;

export function assert(input: unknown, msg: string, isFile?: boolean): true|never {
	return (isFile ? exists(input as string) : !!input) || error(msg);
}

export function group(str: Arrayable<string>): Set<string> {
	return new Set(Array.isArray(str) ? str : str.split(','));
}

export const require = createRequire(import.meta.url);

export async function load<T = unknown>(str: string, dir = '.'): Promise<T | false> {
	if (!exists(str = resolve(dir, str))) return false;
	try { var m = require(str) }
	catch { m = await import(str).catch(() => false) }
	finally { return m || error(`Error loading "${str}" file`) }
}

export async function toConfig(dir?: string): Promise<Config | void> {
	type Pkg = { cfw?: Config };
	let tmp: Config | Pkg | false;
	if (tmp = await load<Config>('cfw.js', dir)) return tmp;
	if (tmp = await load<Config>('cfw.mjs', dir)) return tmp;
	if (tmp = await load<Config>('cfw.cjs', dir)) return tmp;
	if (tmp = await load<Config>('cfw.json', dir)) return tmp;
	if (tmp = await load<Pkg>('package.json', dir)) return tmp.cfw;
}

export async function toWorkerData(dir: string, name: string, isOne?: boolean): Promise<WorkerData> {
	let abs = isOne ? dir : join(dir, name);
	let config = await toConfig(abs) || {};
	return {
		cfw: config,
		name: config.name || name,
		// TODO: config.build.input|entry?
		input: join(abs, config.entry || 'index.js'),
		abs,
	};
}

export async function toWorkers(dirname: string, opts: Options): Promise<WorkerData[]> {
	opts.cwd = resolve(opts.cwd);

	let dir = resolve(opts.cwd, dirname);
	assert(dir, `Workers directory does not exist: "${dir}"`, true);

	let items: Set<string>;
	let conf: Config | void;
	let { cwd, single, only, ignore } = opts;

	if (single) {
		let name = opts.dir;
		if (name === '.') name = parse(cwd).base;
		let obj = await toWorkerData(dir, name, true);
		// check for root config
		if (conf = await toConfig(cwd)) {
			Object.assign(obj.cfw, conf);
			if (conf.name) obj.name = conf.name;
			if (opts.profile) obj.cfw.profile = opts.profile;
		}
		return [obj];
	}

	let arr = await ls(dir, { withFileTypes: true }).then(arr => Promise.all(
		arr.filter(x => x.isDirectory()).map(x => toWorkerData(dir, x.name))
	));

	if (only) {
		items = group(only);
		return arr.filter(obj => items.has(obj.name));
	}

	if (ignore) {
		items = group(ignore);
		return arr.filter(obj => !items.has(obj.name));
	}

	return arr;
}

/**
 * Parse `~/.cfw/config` file.
 * Load a custom credentials `profile`
 */
async function toProfile(profile = 'default'): Promise<Partial<Profile>> {
	let file = join(homedir(), '.cfw', 'config');
	assert(file, `Missing "${file}" config file`, true);

	let data = await read(file, 'utf8');
	let tmp: Partial<Profile>, map: Record<string, Partial<Profile>> = {};
	let i=0, name: string, rgx = /^\[(.*)\]$/;
	let arr = data.split(/(\r?\n)+/g);

	for (; i < arr.length; i++) {
		if (arr[i].startsWith('#') || !arr[i].trim().length) {
			// skip
		} else if (rgx.test(arr[i])) {
			name = rgx.exec(arr[i])[1];
			tmp = map[name] = {};
		} else {
			let [k, v] = arr[i].split('=');
			tmp[k.trim() as keyof Profile] = v.trim();
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
