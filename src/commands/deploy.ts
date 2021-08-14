import colors from 'kleur';
import * as workers from '../cloudflare/workers';
import * as subdomains from '../cloudflare/subdomains';
import * as globals from '../cloudflare/globals';
import * as utils from '../util';
import * as log from '../log';

export default async function (output: string | void, opts: Options) {
	let buildDir = output || 'build';
	let items = await utils.toWorkers(buildDir, opts);
	if (!items.length) return log.missing('Nothing to deploy!', opts);

	let subdomain: string | void;
	let arrow = colors.cyan(log.ARROW);
	let count = colors.bold(items.length);
	let sfx = items.length === 1 ? '' : 's';
	log.info(`Deploying ${count} worker${sfx}:`);

	for (let def of items) {
		let { name, input, cfw } = def;
		cfw.profile = cfw.profile || opts.profile;
		utils.assert(input, `Worker input does not exist: "${input}"`, true);

		let creds = await utils.toCredentials(cfw);

		let metadata = globals.metadata(cfw.globals || {});
		let filedata = await utils.read(input);

		if (cfw.usage) {
			let usage = (cfw.usage || '').toLowerCase().trim();
			utils.assert(/^(bundled|unbound)$/.test(usage), `Invalid "usage" value: "${usage}"`);
			metadata.usage_model = usage as Config['usage'];
		}

		let now = Date.now();
		await workers.script(creds, name, filedata, metadata, !!cfw.module);
		console.log(arrow + name + log.time(Date.now() - now));

		if (cfw.subdomain != null && !subdomain) {
			subdomain = await subdomains.get(creds);
		}

		if (cfw.subdomain) {
			let t1 = Date.now();
			await subdomains.toggle(creds, name, true);
			log.item(`https://${name}.${subdomain}/*`, Date.now() - t1, true);
		} else if (cfw.routes) {
			await Promise.all(
				cfw.routes.map(str => {
					let iter = Date.now();
					let isNot = str.startsWith('!');
					let pattern = str.substring(+isNot);
					return workers.route(creds, pattern, isNot ? null : name).then(() => {
						log.item(pattern, Date.now() - iter, !isNot);
					});
				})
			);

			if (cfw.subdomain != null) {
				let t1 = Date.now();
				await subdomains.toggle(creds, name, false);
				log.item(`https://${name}.${subdomain}/*`, Date.now() - t1, false);
			}
		}
	}

	log.success(`Deployment complete!\nAll items within "${buildDir}" uploaded 🎉`);
}
