module.exports = {
	// input: inject
	output: {
		format: 'esm',
		// file: inject
		sourcemap: false,
	},
	treeshake: {
		propertyReadSideEffects: false,
		pureExternalModules: true
	},
	external: [
		...require('module').builtinModules
	],
	plugins: [
		require('rollup-plugin-node-resolve')({
			browser: true
		})
	]
};
