const pkg = require('./package.json');
const { minify } = require('terser');

module.exports = {
	input: 'src/index.js',
	output: {
		format: 'cjs',
		file: 'lib/index.js',
		esModule: false,
		interop: false,
		strict: false,
	},
	external: [
		...require('module').builtinModules,
		...Object.keys(pkg.dependencies),
	],
	plugins: [
		{
			name: 'terser',
			renderChunk(code, _chunk, opts) {
				return minify(code, {
					toplevel: true,
					sourceMap: !!opts.sourcemap,
					compress: true,
				});
			}
		}
	]
}
