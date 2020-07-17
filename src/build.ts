import klona from 'klona';
import colors from 'kleur';
import premove from 'premove';
import { existsSync } from 'fs';
import { join, resolve } from 'path';
import { toWorkers, write } from './util';
import * as defaults from './config';
import * as log from './log';

export default async function (src: string | void, output: string | void, opts: Partial<Options>) {
	let cwd = opts.cwd = resolve(opts.cwd);

	opts.dirname = src || 'workers';
	opts.dest = output || opts.dest || 'build';

	output = opts.output = resolve(cwd, opts.dest);
	src = opts.src = resolve(cwd, opts.dirname);

	let items = toWorkers(src, opts as Options);

	if (!items.length) {
		let msg = 'No workers to build!';
		if (opts.only || opts.ignore) {
			let flag = colors.dim().bold;
			msg += `\nPerhaps the ${flag('--only')} or ${flag('--ignore')} flag needs adjusting`;
		}
		return log.warn(msg);
	}

	if (existsSync(output)) {
		log.warn(`Removing existing "${opts.dest}" directory`);
		await premove(output);
	}

	const { rollup } = require('rollup');

	let arrow = colors.cyan('   ~> ');
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

		await write(
			join(outdir, 'cfw.json'),
			JSON.stringify({ name, ...cfw }, null, 2)
		);

		console.log(arrow + name + colors.italic().dim(` (${Date.now() - now}ms)`));
	}

	log.success(`Build complete!\nYour worker${sfx} ${items.length === 1 ? 'is' : 'are'} ready for deployment 🎉`);
}
