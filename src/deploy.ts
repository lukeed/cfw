import colors from 'kleur';
import { resolve } from 'path';
import * as worker from './cloudflare/worker';
import { log, success, warn, error } from './log';
import { read, toCredentials, toWorkers } from './util';

function upload(file: string, name: string, creds: Credentials) {
	return read(file, 'utf8').then(data => {
		return worker.script(data, name, creds);
	}).catch(err => {
		error(`Error reading input file!\nAttempted path: "${file}"\nReason: "${err.message || err.stack}"`);
	});
}

export default async function (output: string | void, opts: Options) {
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
	type Colorize = (msg: string | number) => string;
	let attached: Colorize = x => colors.green().dim(`      + "${x}"`);
	let detached: Colorize = x => colors.red().dim(`      - "${x}"`);
	let delta: Colorize = ms => colors.italic().dim(` (${ms}ms)`);

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
					return worker.route(pattern, isNot ? null : name, creds).then(() => {
						console.log((isNot ? detached : attached)(pattern) + delta(Date.now() - iter));
					});
				})
			);
		}

		// TODO: resources
	}

	success(`Deployment complete!\nAll items within "${opts.dest}" uploaded 🎉`);
}
