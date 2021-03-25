import colors from 'kleur';
import { klona } from 'klona/json';
import { join, resolve } from 'path';
import * as utils from '../util';
import * as log from '../log';

import type { BuildOptions } from 'esbuild';

const defaults: BuildOptions = {
	bundle: true,
	format: 'esm',
	charset: 'utf8',
	sourcemap: false,
	outfile: '<injected>',
	entryPoints: ['<injected>'],
	resolveExtensions: ['.tsx', '.ts', '.jsx', '.mjs', '.js', '.json'],
	mainFields: ['worker', 'browser', 'module', 'jsnext', 'main'],
	conditions: ['worker', 'browser', 'import', 'production'],
};

export default async function (src: string | void, output: string | void, opts: Partial<Options>) {
	opts.dir = src || opts.dir;

	let items = utils.toWorkers(opts.dir, opts as Options);
	if (!items.length) return log.missing('Nothing to build!', opts);

	let buildDir = output || 'build';
	output = resolve(opts.cwd, buildDir);
	src = resolve(opts.cwd, opts.dir);

	if (utils.exists(output)) {
		log.warn(`Removing existing "${buildDir}" directory`);
		await utils.rmdir(output, { recursive: true });
	}

	const esbuild = await import('esbuild');

	let arrow = colors.cyan(log.ARROW);
	let count = colors.bold(items.length);
	let sfx = items.length === 1 ? '' : 's';
	log.info(`Building ${count} worker${sfx}:`);

	for (let def of items) {
		let config = klona(defaults);
		let { name, input, cfw } = def;
		config.entryPoints = [input];

		let outdir = join(output, opts.single ? '' : name);
		config.outfile = join(outdir, 'index.js');

		if (typeof cfw.build === 'function') {
			cfw.build(config); // mutate~!
		}

		try {
			var now = Date.now();
			let result = await esbuild.build(config);
			result.warnings.forEach(msg => {
				console.warn('TODO', msg);
			});
		} catch (err) {
			return log.error(err.stack || err.message);
		}

		await utils.write(
			join(outdir, 'cfw.json'),
			JSON.stringify({ name, ...cfw }, null, 2)
		);

		console.log(arrow + name + log.time(Date.now() - now));
	}

	log.success(`Build complete!\nYour worker${sfx} ${items.length === 1 ? 'is' : 'are'} ready for deployment 🎉`);
}
