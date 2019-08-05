const colors = require('kleur');
const { send } = require('httpie');
const { resolve } = require('path');
const { log, success, error, warn } = require('./log');
const { read, toCredentials, toWorkers } = require('./util');

const API = 'https://api.cloudflare.com/client/v4';

function route(pattern, script, creds) {
	return send('POST', `${API}/zones/${creds.zoneid}/workers/routes`, {
		headers: {
			'X-Auth-Key': creds.authkey,
			'X-Auth-Email': creds.email,
			'Content-Type': 'application/javascript',
		},
		body: {
			pattern,
			script
		}
	}).catch(err => {
		error(`Error setting "${pattern}" route pattern!\n${JSON.stringify(err.data || err.message, null, 2)}`);
	});
}

function upload(file, name, creds) {
	return read(file, 'utf8').then(data => {
		return send('PUT', `${API}/accounts/${creds.accountid}/workers/scripts/${name}`, {
			headers: {
				'X-Auth-Key': creds.authkey,
				'X-Auth-Email': creds.email,
				'Content-Type': 'application/javascript',
			},
			body: data
		}).catch(err => {
			error(`Error uploading "${name}" script!\n${JSON.stringify(err.data || err.message, null, 2)}`);
		});
	}).catch(err => {
		error(`Error reading input file!\nAttempted path: "${file}"\nReason: "${err.message || err.stack}"`);
	});
}

module.exports = async function (output, opts) {
	let cwd = opts.cwd = resolve(opts.cwd);

	opts.dest = output || 'build';
	output = resolve(cwd, opts.dest);

	let items = toWorkers(output, opts);

	if (!items.length) {
		let msg = 'Nothing to deploy!';
		if (opts.only || opts.ignore) {
			let flag = colors.dim().bold;
			msg += `\nPerhaps the ${flag('--only')} or ${flag('--ignore')} flag needs adjusting`;
		}
		return warn(msg);
	}

	let arrow = colors.cyan('   ~> ');
	let detached = x => colors.red().dim(`      - "${x}"`);
	let attached = x => colors.green().dim(`      + "${x}"`);
	let delta = ms => colors.italic().dim(` (${ms}ms)`);

	let sfx = items.length === 1 ? '' : 's';
	let count = colors.bold(items.length);
	log(`Deploying ${count} worker${sfx}:`);

	for (let def of items) {
		let { name, input, cfw } = def;
		let creds = await toCredentials(cfw);

		let now = Date.now();
		await upload(input, name, creds);
		console.log(arrow + name + delta(Date.now() - now));

		if (cfw.routes) {
			await Promise.all(
				cfw.routes.map(str => {
					let iter = Date.now();
					let isNot = str.startsWith('!');
					let pattern = str.substring(+isNot);
					return route(pattern, isNot ? null : name, creds).then(() => {
						console.log((isNot ? detached : attached)(pattern) + delta(Date.now() - iter));
					});
				})
			);
		}

		// TODO: resources
	}

	success(`Deployment complete!\nAll items within "${opts.dest}" uploaded 🎉`);
}
