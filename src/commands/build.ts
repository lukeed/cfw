import klona from 'klona';
import colors from 'kleur';
import premove from 'premove';
import { existsSync } from 'fs';
import { join, resolve } from 'path';
import * as defaults from '../config';
import * as utils from '../util';
import * as log from '../log';

export default async function (src: string | void, output: string | void, opts: Partial<Options>) {
	let buildDir = output || 'build';
	let cwd = opts.cwd = resolve(opts.cwd);

	opts.dir = src || opts.dir;

	src = opts.source = resolve(cwd, opts.dir);
	output = opts.output = resolve(cwd, buildDir);

	let items = utils.toWorkers(src, opts as Options);
	if (!items.length) return log.missing('Nothing to build!', opts);

	if (existsSync(output)) {
		log.warn(`Removing existing "${buildDir}" directory`);
		await premove(output);
	}

	const { rollup } = require('rollup');

	let arrow = colors.cyan(log.ARROW);
	let sfx = items.length === 1 ? '' : 's';
	let count = colors.bold(items.length);
	log.info(`Building ${count} worker${sfx}:`);

	for (let def of items) {
		let { name, input, cfw } = def;
		let options = klona(defaults.options);
		let config = { input, ...defaults.config };
		let outdir = join(output, opts.single ? '' : name);
		config.output.file = join(outdir, 'index.js');

		if (typeof cfw.build === 'function') {
			config = klona(config);
			cfw.build(config, options); // mutate~!
		}

		config.plugins.push(
			require('@rollup/plugin-node-resolve').default(options.resolve)
		);

		let now = Date.now();
		await rollup(config).then((bun: Rollup.Bundle) => {
			return bun.write(config.output);
		});

		await utils.write(
			join(outdir, 'cfw.json'),
			JSON.stringify({ name, ...cfw }, null, 2)
		);

		console.log(arrow + name + colors.italic().dim(` (${Date.now() - now}ms)`));
	}

	log.success(`Build complete!\nYour worker${sfx} ${items.length === 1 ? 'is' : 'are'} ready for deployment 🎉`);
}
