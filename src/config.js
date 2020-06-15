export const options = {
	resolve: {
		mainFields: ['worker', 'browser', 'module', 'jsnext', 'main']
	}
};

export const config = {
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
