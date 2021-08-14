import colors from 'kleur';
import * as Secrets from '../cloudflare/secrets';
import * as utils from '../util';
import * as log from '../log';

export async function list(opts: Options) {
	let items = await utils.toWorkers(opts.dir, opts as Options);
	if (!items.length) return log.missing('No workers found!', opts);

	let count = colors.bold(items.length);
	let sfx = items.length === 1 ? '' : 's';
	log.info(`Fetching secrets for ${count} worker${sfx}:`);

	let arrow = colors.cyan(log.ARROW);

	for (let def of items) {
		let { name, cfw } = def;
		cfw.profile = cfw.profile || opts.profile;
		let creds = await utils.toCredentials(cfw);

		let res = await Secrets.list(creds, name);
		console.log(arrow + `"${name}" secrets:`);
		if (res.result.length) {
			for (let tmp of res.result) log.item(tmp.name);
		} else {
			console.log(log.SPACER + colors.italic().dim(' None'));
		}
	}

	log.success(`Retrieved worker${sfx ? `s'` : `'s`} secrets`);
}

export async function create(key: string, value: string, opts: Options) {
	let items = await utils.toWorkers(opts.dir, opts as Options);
	if (!items.length) return log.missing('No workers found!', opts);

	let arrow = colors.cyan(log.ARROW);
	let count = colors.bold(items.length);
	let sfx = items.length === 1 ? '' : 's';
	let toAdd: Array<() => Promise<void>> = [];
	log.info(`Adding secret "${key}" value to ${count} worker${sfx}:`);

	for (let def of items) {
		let { name, cfw } = def;
		cfw.profile = cfw.profile || opts.profile;
		let creds = await utils.toCredentials(cfw);
		toAdd.push(() => {
			let now = Date.now();
			return Secrets.create(creds, name, key, value).then(res => {
				if (res.success) console.log(arrow + name + log.time(Date.now() - now));
			})
		});
	}

	await Promise.all(toAdd.map(x => x()));
	log.success(`Added secret to worker${sfx}`);
}

export async function destroy(key: string, opts: Options & { quiet?: boolean }) {
	let items = await utils.toWorkers(opts.dir, opts as Options);
	if (!items.length) return log.missing('No workers found!', opts);

	let count = colors.bold(items.length);
	let sfx = items.length === 1 ? '' : 's';
	let toRem: Array<() => Promise<void>> = [];
	log.info(`Removing "${key}" secret from ${count} worker${sfx}:`);

	for (let def of items) {
		let { name, cfw } = def;
		cfw.profile = cfw.profile || opts.profile;
		let creds = await utils.toCredentials(cfw);
		toRem.push(() => {
			let now = Date.now();
			return Secrets.destroy(creds, name, key, !!opts.quiet).then(res => {
				let arrow = (res.success ? colors.cyan : colors.red)(log.ARROW);
				console.log(arrow + name + log.time(Date.now() - now));
			})
		});
	}

	await Promise.all(toRem.map(x => x()));
	log.success(`Removed secret from worker${sfx}`);
}
