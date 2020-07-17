export const options: Rollup.Options = {
	resolve: {
		mainFields: ['worker', 'browser', 'module', 'jsnext', 'main']
	}
};

export const config: Rollup.Config = {
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
		// injected
	]
};
