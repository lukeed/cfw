const config = {
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
	plugins: [
		require('@rollup/plugin-node-resolve').default({
			mainFields: ['worker', 'browser', 'module', 'jsnext', 'main']
		})
	]
};

export default config;
