import fs from 'fs';
import { homedir } from 'os';
import { promisify } from 'util';
import { parse, join, resolve } from 'path';
import { error } from './log';

export const write = promisify(fs.writeFile);
export const read = promisify(fs.readFile);

/**
 * @param {any} mix
 * @param {string} msg
 * @param {boolean} [toExist]
 */
export function assert(mix, msg, toExist) {
	(toExist ? fs.existsSync(mix) : !!mix) || error(msg);
}

/**
 * @param {Array|string} str
 * @returns {string[]}
 */
export function list(str) {
	return Array.isArray(str) ? str : str.split(',');
}

/**
 * @param {string} str
 * @param {string} [dir]
 * @returns {import('module').Module|false}
 */
export function load(str, dir) {
	str = resolve(dir || '.', str);
	return fs.existsSync(str) && require(str);
}

/**
 * @param {string} dir
 * @param {any} [tmp]
 * @returns {Config|void}
 */
export function toConfig(dir, tmp) {
	if (tmp = load('cfw.js', dir)) return tmp;
	if (tmp = load('cfw.json', dir)) return tmp;
	if (tmp = load('package.json', dir)) return tmp.cfw;
}

/**
 * @typedef Config
 * @property {string} [name] Customize the Worker's name.
 * @property {string} [zoneid] Customize the Worker's name.
 * @property {string} [profile] Name of user profile to use.
 * @property {string[]} [routes] List of route patterns to attach.
 * @property {string} [entry] Customize entrypoint (default "index.js")
 */

/**
 * @typedef WorkerData
 * @property {string} input Entry point.
 * @property {string} name Name of the worker script.
 * @property {string} abs Absolute path to worker directory.
 * @property {Config} [cfw] Custom `cfw` options
 */

/**
 * @param {string} dir
 * @param {string} name
 * @param {boolean} [isOne]
 * @returns {WorkerData}
 */
export function toWorker(dir, name, isOne) {
	let abs = isOne ? dir : join(dir, name);
	let config = toConfig(abs) || {};
	return {
		cfw: config,
		name: config.name || name,
		input: join(abs, config.entry || 'index.js'),
		abs,
	};
}

export function toWorkers(dir, opts) {
	assert(dir, `Workers directory does not exist: "${dir}"`, true);

	let tmp, { cwd, single, only, ignore } = opts;

	if (single) {
		let name = opts.dirname;
		if (name === '.') name = parse(cwd).base;
		let obj = toWorker(dir, name, true);
		// check for root config
		if (tmp = toConfig(cwd)) {
			if (tmp.name) obj.name = tmp.name;
			Object.assign(obj.cfw, tmp);
			if (opts.profile) obj.cfw.profile = opts.profile;
		}
		return [obj];
	}

	let arr = fs.readdirSync(dir).map(x => toWorker(dir, x));

	if (only) {
		tmp = list(only);
		return arr.filter(obj => tmp.includes(obj.name));
	}

	if (ignore) {
		tmp = list(ignore);
		return arr.filter(obj => !tmp.includes(obj.name));
	}

	return arr;
}

/**
 * @typedef Profile
 * @property {string} cloudflare_auth_key
 * @property {string} cloudflare_auth_email
 * @property {string} cloudflare_accountid
 * @property {string} [cloudflare_zoneid]
 */

/**
 * Parse `~/.cfw/config` file.
 * Load a custom credentials `profile`
 * @param {string} [profile]
 * @returns {Promise<Profile>}
 */
async function toProfile(profile = 'default') {
	let file = join(homedir(), '.cfw', 'config');
	assert(file, `Missing "${file}" config file`, true);

	let data = await read(file, 'utf8');
	let arr = data.split(/\n+/g);
	let i=0, name, tmp, map={};
	let rgx = /^\[(.*)\]$/;

	for (; i < arr.length; i++) {
		if (arr[i].startsWith('#') || !arr[i].trim().length) {
			// skip
		} else if (rgx.test(arr[i])) {
			name = rgx.exec(arr[i])[1];
			tmp = map[name] = {};
		} else {
			let [k, v] = arr[i].split(/\s*=\s*/);
			tmp[k] = v;
		}
	}

	let out = map[profile];
	assert(out, `The "${profile}" profile is not defined`);
	return out;
}

/**
 * @typedef Credentials
 * @property {string} zoneid Target Zone ID
 * @property {string} accountid Target Account ID
 * @property {string} [token] An API token; required if `authkey` and `email` are missing.
 * @property {string} [authkey] Account authorization key; required if `token` is missing.
 * @property {string} [email] Account email address; required if `token` is missing.
 */

/**
 * @param {Config} def
 * @returns {Promise<Credentials>}
 */
export async function toCredentials(def) {
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
		for (let k of Object.keys(extra)) {
			if (!email && /CLOUDFLARE_AUTH_EMAIL/i.test(k)) email = extra[k];
			if (!accountid && /CLOUDFLARE_ACCOUNTID/i.test(k)) accountid = extra[k];
			if (!authkey && /CLOUDFLARE_AUTH_KEY/i.test(k)) authkey = extra[k];
			if (!zoneid && /CLOUDFLARE_ZONEID/i.test(k)) zoneid = extra[k];
			if (!token && /CLOUDFLARE_TOKEN/i.test(k)) token = extra[k];
		}
	}

	assert(zoneid, 'Missing Cloudflare "zoneid" value!');
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
