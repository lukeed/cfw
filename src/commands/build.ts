import colors from 'kleur';
import { existsSync } from 'fs';
import { premove } from 'premove';
import { klona } from 'klona/lite';
import { join, resolve } from 'path';
import * as defaults from '../config';
import * as utils from '../util';
import * as log from '../log';

export default async function (src: string | void, output: string | void, opts: Partial<Options>) {
	opts.dir = src || opts.dir;

	let items = utils.toWorkers(opts.dir, opts as Options);
	if (!items.length) return log.missing('Nothing to build!', opts);

	let buildDir = output || 'build';
	src = resolve(opts.cwd, opts.dir);
	output = resolve(opts.cwd, buildDir);

	if (existsSync(output)) {
		log.warn(`Removing existing "${buildDir}" directory`);
		await premove(output);
	}

	const { rollup } = require('rollup');

	let arrow = colors.cyan(log.ARROW);
	let count = colors.bold(items.length);
	let sfx = items.length === 1 ? '' : 's';
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

		console.log(arrow + name + log.time(Date.now() - now));
	}

	log.success(`Build complete!\nYour worker${sfx} ${items.length === 1 ? 'is' : 'are'} ready for deployment 🎉`);
}
