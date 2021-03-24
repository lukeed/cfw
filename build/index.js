/**
 * UNUSED - redundant `lib/index.mjs` output
 * @see https://github.com/evanw/esbuild/issues/475
 */
const { build } = require('esbuild');
const pkg = require('../package.json');

(async function () {
	await build({
		bundle: true,
		format: 'esm',
		entryPoints: [
			'src/index.ts',
		],
		outfile: 'lib/index.mjs',
		sourcemap: false,
		charset: 'utf8',
		// minify: true,
		external: [
			...require('module').builtinModules,
			...Object.keys(pkg.dependencies),
		]
	})
})().catch(err => {
	console.error(err.stack);
	process.exitCode = 1;
});
