import colors from 'kleur';
import { resolve } from 'path';
import * as workers from '../cloudflare/workers';
import * as utils from '../util';
import * as log from '../log';

async function upload(file: string, name: string, creds: Credentials) {
	let data = await utils.read(file, 'utf8');
	return workers.script(creds, name, data);
}

export default async function (output: string | void, opts: Options) {
	let cwd = opts.cwd = resolve(opts.cwd);

	opts.dest = output || 'build';
	output = resolve(cwd, opts.dest);

	let items = utils.toWorkers(output, opts);

	if (!items.length) {
		let msg = 'Nothing to deploy!';
		if (opts.only || opts.ignore) {
			let flag = colors.dim().bold;
			msg += `\nPerhaps the ${flag('--only')} or ${flag('--ignore')} flag needs adjusting`;
		}
		return log.warn(msg);
	}

	let arrow = colors.cyan('   ~> ');
	type Colorize = (msg: string | number) => string;
	let attached: Colorize = x => colors.green().dim(`      + "${x}"`);
	let detached: Colorize = x => colors.red().dim(`      - "${x}"`);
	let delta: Colorize = ms => colors.italic().dim(` (${ms}ms)`);

	let sfx = items.length === 1 ? '' : 's';
	let count = colors.bold(items.length);
	log.info(`Deploying ${count} worker${sfx}:`);

	for (let def of items) {
		let { name, input, cfw } = def;
		utils.exists(input, `Worker input does not exist: "${input}"`);

		let creds = await utils.toCredentials(cfw);

		let now = Date.now();
		await upload(input, name, creds);
		console.log(arrow + name + delta(Date.now() - now));

		if (cfw.routes) {
			await Promise.all(
				cfw.routes.map(str => {
					let iter = Date.now();
					let isNot = str.startsWith('!');
					let pattern = str.substring(+isNot);
					return workers.route(creds, pattern, isNot ? null : name).then(() => {
						let fmt = isNot ? detached : attached;
						console.log(fmt(pattern) + delta(Date.now() - iter));
					});
				})
			);
		}

		// TODO: resources
	}

	log.success(`Deployment complete!\nAll items within "${opts.dest}" uploaded 🎉`);
}
