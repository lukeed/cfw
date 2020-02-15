const mime = require('mime');
const colors = require('kleur');
const tlist = require('totalist');
const { resolve } = require('path');
const { error, log, success } = require('./log');
const { assert, toConfig, toCredentials, read } = require('./util');
const KV = require('./cloudflare/kv');

module.exports = async function (dirname, target, opts) {
	let cwd = opts.cwd = resolve(opts.cwd);
	let dir = resolve(cwd, dirname);

	assert(dir, 'Directory not found', true);

	if (/[\s\r\n]/.test(target)) {
		return error('Namespace cannot include whitespace');
	}

	const config = toConfig(dir) || {};
	if (opts.profile) config.profile = opts.profile;

	// temp
	config.zoneid = '1235';

	let arrow = colors.cyan('   ~> ');
	let delta = ms => colors.italic().dim(` (${ms}ms)`);

	const creds = await toCredentials(config);

	log('Preparing KV namespace:');
	const namespaces = await KV.list(creds);
	const existing = namespaces.find(x => x.title === target);
	if (existing) {
		await KV.destroy(existing.id, creds);
		console.log(colors.red().dim(`    - "${target}"`));
	}

	const created = await KV.create(target, creds);
	console.log(colors.green().dim(`    + "${target}"`));

	const queue = [];
	const MANIFEST = {};

	await tlist(dir, async (rel, abs, stats) => {
		if (stats.size >= 1e7) error(`Asset is larger than 10MB! "${rel}"`);

		MANIFEST[rel] = {
			// TODO: cache / custom headers here
			'content-type': mime.getType(rel)
		};

		queue.push(
			read(abs).then(data => {
				return KV.set(created.id, rel, data, creds);
			})
		);
	});

	log(`Uploading directory:`);

	let now = Date.now();
	await Promise.all(queue);
	console.log(arrow + `"${dirname}/**"` + delta(Date.now() - now));

	// TODO: ERROR?
	// TODO: Route Manifest?
	// TODO: load config from `cfw.json`
	const CONFIG = { spa: true, extensions: ['html'] };
	const __CONFIG = JSON.stringify({ CONFIG, MANIFEST });

	now = Date.now();
	await KV.set(created.id, '__CONFIG', __CONFIG, creds);
	console.log(arrow + `__CONFIG` + delta(Date.now() - now));

	success(`Deployment complete!\nAll files within "${dirname}" uploaded 🎉`);
}
