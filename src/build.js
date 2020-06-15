import klona from 'klona';
import colors from 'kleur';
import { join, resolve } from 'path';
import { log, success, warn } from './log';
import { rimraf, toWorkers, write } from './util';
import baseConfig from './config';

export default async function (src, output, opts) {
	let cwd = opts.cwd = resolve(opts.cwd);

	opts.dirname = src || 'workers';
	opts.dest = output || opts.dest || 'build';

	output = opts.output = resolve(cwd, opts.dest);
	src = opts.src = resolve(cwd, opts.dirname);

	let items = toWorkers(src, opts);

	if (!items.length) {
		let msg = 'No workers to build!';
		if (opts.only || opts.ignore) {
			let flag = colors.dim().bold;
			msg += `\nPerhaps the ${flag('--only')} or ${flag('--ignore')} flag needs adjusting`;
		}
		return warn(msg);
	}

	await rimraf(output);

	const { rollup } = require('rollup');

	let arrow = colors.cyan('   ~> ');
	let sfx = items.length === 1 ? '' : 's';
	let count = colors.bold(items.length);
	log(`Building ${count} worker${sfx}:`);

	for (let def of items) {
		let { name, input, cfw } = def;
		let config = { input, ...baseConfig };
		let outdir = join(output, opts.single ? '' : name);
		config.output.file = join(outdir, 'index.js');
		if (typeof cfw.build === 'function') {
			config = klona(config);
			cfw.build(config); // mutate~!
		}

		let now = Date.now();
		await rollup(config).then(b => {
			return b.write(config.output);
		});

		await write(
			join(outdir, 'cfw.json'),
			JSON.stringify({ name, ...cfw }, null, 2)
		);

		console.log(arrow + name + colors.italic().dim(` (${Date.now() - now}ms)`));
	}

	success(`Build complete!\nYour worker${sfx} ${items.length === 1 ? 'is' : 'are'} ready for deployment 🎉`);
}
