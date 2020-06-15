import fs from 'fs';
import del from 'premove';
import { homedir } from 'os';
import { promisify } from 'util';
import { parse, join, resolve } from 'path';
import { warn, error } from './log';

export const write = promisify(fs.writeFile);
export const read = promisify(fs.readFile);

export function rimraf(path) {
	if (!fs.existsSync(path)) return;
	warn(`Removing existing "${parse(path).name}" directory`);
	return del(path);
}

export function assert(mix, msg, toExist) {
	(toExist ? fs.existsSync(mix) : !!mix) || error(msg);
}

export function list(str) {
	return Array.isArray(str) ? str : str.split(',');
}

export function load(str, dir) {
	str = resolve(dir || '.', str);
	return fs.existsSync(str) && require(str);
}

export function toConfig(dir, tmp) {
	if (tmp = load('cfw.js', dir)) return tmp;
	if (tmp = load('cfw.json', dir)) return tmp;
	if (tmp = load('package.json', dir)) return tmp.cfw;
}

export function toWorker(dir, name, isOne) {
	let abs = isOne ? dir : join(dir, name);

	let out = { abs, name };
	let config = toConfig(abs) || {};
	out.input = join(abs, config.entry || 'index.js');
	if (config.name) out.name = config.name;
	out.cfw = config;
	return out;
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
