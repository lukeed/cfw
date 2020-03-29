module.exports = {
	// input: inject
	output: {
		format: 'esm',
		// file: inject
		sourcemap: false,
	},
	treeshake: {
		propertyReadSideEffects: false,
		moduleSideEffects: 'no-external',
		tryCatchDeoptimization: false
	},
	external: [
		...require('module').builtinModules
	],
	plugins: [
		require('@rollup/plugin-node-resolve')({
			browser: true
		})
	]
};
