const pkg = require('./package.json');

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
	]
}
