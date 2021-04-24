import colors from 'kleur';
import { klona } from 'klona/json';
import { join, resolve } from 'path';
import * as utils from '../util';
import * as log from '../log';

import type { BuildFailure, BuildOptions } from 'esbuild';

const defaults: BuildOptions = {
	bundle: true,
	format: 'esm',
	charset: 'utf8',
	sourcemap: false,
	outfile: '<injected>',
	entryPoints: ['<injected>'],
	minify: true, // disable via `--no-minify` flag
	logLevel: 'silent', // errors & warnings are handled manually
	resolveExtensions: ['.tsx', '.ts', '.jsx', '.mjs', '.js', '.json'],
	mainFields: ['worker', 'browser', 'module', 'jsnext', 'main'],
	conditions: ['worker', 'browser', 'import', 'production'],
};

export default async function (src: string | void, output: string | void, opts: Options) {
	opts.dir = src || opts.dir;

	let items = await utils.toWorkers(opts.dir, opts as Options);
	if (!items.length) return log.missing('Nothing to build!', opts);

	let buildDir = output || 'build';
	output = resolve(opts.cwd, buildDir);
	src = resolve(opts.cwd, opts.dir);

	if (utils.exists(output)) {
		log.warn(`Removing existing "${buildDir}" directory`);
		await utils.rmdir(output, { recursive: true });
	}

	const esbuild = await import('esbuild');
	let isMinify = String(opts.minify) !== 'false';

	let arrow = colors.cyan(log.ARROW);
	let count = colors.bold(items.length);
	let sfx = items.length === 1 ? '' : 's';
	log.info(`Building ${count} worker${sfx}:`);

	for (let def of items) {
		let config = klona(defaults);
		let { name, input, cfw } = def;
		config.entryPoints = [input];
		config.minify = isMinify;

		if (typeof cfw.build === 'function') {
			cfw.build(config); // mutate~!

			let reverts = [];
			if (config.splitting) reverts.push('splitting');
			if ((config.external || []).length) reverts.push('external');
			if (config.format !== 'esm') reverts.push('format');
			if (config.sourcemap) reverts.push('sourcemap');

			if (reverts.length) {
				let indent = '\n  ' + colors.dim().red('- ');
				let text = 'Invalid configuration customization!\nPlease revert or remove the following keys:'
				reverts.forEach(key => text += indent + key);
				return log.error(text);
			}
		}

		let outdir = join(output, opts.single ? '' : name);
		config.outfile = join(outdir, 'index.js');

		try {
			var now = Date.now();
			var result = await esbuild.build(config);
		} catch (err) {
			let { errors } = err as BuildFailure;
			return await log.messages(errors, true);
		}

		delete cfw.entry;

		await utils.write(
			join(outdir, 'cfw.json'),
			JSON.stringify({ name, ...cfw }, null, 2)
		);

		console.log(arrow + name + log.time(Date.now() - now));
		await log.messages(result.warnings);
	}

	log.success(`Build complete!\nYour worker${sfx} ${items.length === 1 ? 'is' : 'are'} ready for deployment 🎉`);
}
