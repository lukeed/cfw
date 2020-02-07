#!/usr/bin/env node
const sade = require('sade');
const build = require('./lib/build');
const { version } = require('./package');
const deploy = require('./lib/deploy');

sade('cfw')
	.version(version)
	.option('--cwd', 'The relative working directory', '.')
	.option('--profile', 'The CFW account profile to load')

	.command('build [src] [output]')
	.describe('Compile the Worker(s) within a directory.')
	.option('--dir', 'The directory Worker scripts', 'workers')
	.option('--only', 'The list of Worker names to build; overrides `--ignore` list!')
	.option('--ignore', 'The list of Worker names to skip')
	.action(build)

	.command('deploy [output]')
	.describe('Deploy the built Worker(s) – requires you `build` first.')
	.option('--dir', 'The directory Worker scripts', 'workers')
	.option('--only', 'The list of Worker names to build; overrides `--ignore` list!')
	.option('--ignore', 'The list of Worker names to skip')
	.action(deploy)

	.parse(process.argv);
