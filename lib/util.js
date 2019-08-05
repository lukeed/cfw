const fs = require('fs');
const del = require('premove');
const { homedir } = require('os');
const { promisify } = require('util');
const { parse, join, resolve } = require('path');
const { warn, error } = require('./log');

exports.write = promisify(fs.writeFile);
const read = exports.read = promisify(fs.readFile);

exports.rimraf = function (path) {
	if (!fs.existsSync(path)) return;
	warn(`Removing existing "${parse(path).name}" directory`);
	return del(path);
}

function assert(mix, msg, toExist) {
	(toExist ? fs.existsSync(mix) : !!mix) || error(msg);
}

function list(str) {
	return Array.isArray(str) ? str : str.split(',');
}

const load = exports.load = function (str, dir) {
	str = resolve(dir || '.', str);
	return fs.existsSync(str) && require(str);
}

exports.toConfig = function (dir, tmp) {
	if (tmp = load('cfw.js', dir)) return tmp;
	if (tmp = load('cfw.json', dir)) return tmp;
	if (tmp = load('package.json', dir)) return tmp.cfw;
}

exports.toWorker = function (dir, name, isOne) {
	let abs = isOne ? dir : join(dir, name);

	let out = { abs, name };
	let config = exports.toConfig(abs) || {};
	out.input = join(abs, config.entry || 'index.js');
	if (config.name) out.name = config.name;
	out.cfw = config;
	return out;
}

exports.toWorkers = function (dir, opts) {
	assert(dir, `Workers directory does not exist: "${dir}"`, true);

	let tmp, { cwd, single, only, ignore } = opts;

	if (single) {
		let name = opts.dirname;
		if (name === '.') name = parse(cwd).base;
		let obj = exports.toWorker(dir, name, true);
		// check for root config
		if (tmp = exports.toConfig(cwd)) {
			if (tmp.name) obj.name = tmp.name;
			Object.assign(obj.cfw, tmp);
		}
		return [obj];
	}

	let arr = fs.readdirSync(dir).map(x => exports.toWorker(dir, x));

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

exports.toCredentials = async function (def) {
	let {
		CLOUDFLARE_ZONEID, CLOUDFLARE_ACCOUNTID,
		CLOUDFLARE_AUTH_EMAIL, CLOUDFLARE_AUTH_KEY,
	} = process.env;

	let email = CLOUDFLARE_AUTH_EMAIL || def.email;
	let accountid = CLOUDFLARE_ACCOUNTID || def.accountid;
	let authkey = CLOUDFLARE_AUTH_KEY || def.authkey;
	let zoneid = CLOUDFLARE_ZONEID || def.zoneid;

	// return early if all defined already
	if (authkey && accountid && email && zoneid) {
		return { authkey, accountid, email, zoneid };
	}

	if (def.profile) {
		let extra = await toProfile(def.profile);
		for (let k of Object.keys(extra)) {
			if (!email && /CLOUDFLARE_AUTH_EMAIL/i.test(k)) email = extra[k];
			if (!accountid && /CLOUDFLARE_ACCOUNTID/i.test(k)) accountid = extra[k];
			if (!authkey && /CLOUDFLARE_AUTH_KEY/i.test(k)) authkey = extra[k];
			if (!zoneid && /CLOUDFLARE_ZONEID/i.test(k)) zoneid = extra[k];
		}
	}

	assert(email, 'Missing Cloudflare "email" value!');
	assert(accountid, 'Missing Cloudflare "accountid" value!');
	assert(authkey, 'Missing Cloudflare "authkey" value!');
	assert(zoneid, 'Missing Cloudflare "zoneid" value!');

	return { authkey, accountid, email, zoneid };
}
