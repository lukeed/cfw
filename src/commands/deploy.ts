import colors from 'kleur';
import * as workers from '../cloudflare/workers';
import * as globals from '../cloudflare/globals';
import * as utils from '../util';
import * as log from '../log';

export default async function (output: string | void, opts: Options) {
	let buildDir = output || 'build';
	let items = utils.toWorkers(buildDir, opts as Options);
	if (!items.length) return log.missing('Nothing to deploy!', opts);

	let arrow = colors.cyan(log.ARROW);
	type Colorize = (msg: string | number) => string;
	let attached: Colorize = x => colors.green().dim(`      + "${x}"`);
	let detached: Colorize = x => colors.red().dim(`      - "${x}"`);
	let delta: Colorize = ms => colors.italic().dim(` (${ms}ms)`);

	let count = colors.bold(items.length);
	let sfx = items.length === 1 ? '' : 's';
	log.info(`Deploying ${count} worker${sfx}:`);

	for (let def of items) {
		let { name, input, cfw } = def;
		cfw.profile = cfw.profile || opts.profile;
		utils.exists(input, `Worker input does not exist: "${input}"`);

		let creds = await utils.toCredentials(cfw);

		let metadata = cfw.globals && globals.metadata(cfw.globals);
		let filedata = await utils.read(input);

		let now = Date.now();
		await workers.script(creds, name, filedata, metadata);
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
	}

	log.success(`Deployment complete!\nAll items within "${buildDir}" uploaded 🎉`);
}
