const colors = require('kleur');
const { rollup } = require('rollup');
const { join, resolve } = require('path');
const { log, success, warn } = require('./log');
const { rimraf, toWorkers, write } = require('./util');
const baseConfig = require('./config');

module.exports = async function (src, output, opts) {
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
			msg += `\nPerhaps the ${flag('--only')} or ${flag('--ignore')} flags need adjusting`;
		}
		return warn(msg);
	}

	await rimraf(output);

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
			cfw.build(config); // mutate~!
		}

		let now = Date.now();
		await rollup(config).then(b => b.write(config.output));

		await write(
			join(outdir, 'cfw.json'),
			JSON.stringify({ name, ...cfw }, null, 2)
		);

		console.log(arrow + name + colors.italic().dim(` (${Date.now() - now}ms)`));
	}

	success(`Build complete!\nYour "${opts.dest}" directory is ready for deployment 🎉`, true);
}
