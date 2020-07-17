#!/usr/bin/env node
const sade = require('sade');
const commands = require('./lib');
const { version } = require('./package');

sade('cfw')
	.version(version)
	.option('-C, --cwd', 'The relative working directory', '.')
	.option('-P, --profile', 'The CFW account profile to load')

	.command('build [src] [output]')
	.describe('Compile the Worker(s) within a directory.')
	.option('-d, --dir', 'The directory Worker scripts', 'workers')
	.option('-o, --only', 'The list of Worker names to build; overrides `--ignore` list!')
	.option('-i, --ignore', 'The list of Worker names to skip')
	.action(commands.build)

	.command('deploy [output]')
	.describe('Deploy the built Worker(s) – requires you `build` first.')
	.option('-d, --dir', 'The directory Worker scripts', 'workers')
	.option('-o, --only', 'The list of Worker names to build; overrides `--ignore` list!')
	.option('-i, --ignore', 'The list of Worker names to skip')
	.action(commands.deploy)

	.command('kv namespaces list')
	.describe('List all KV namespaces')
	.action(commands.ns.list)

	.command('kv namespaces create <title>')
	.describe('Create a new KV namespace')
	.action(commands.ns.create)

	.command('kv namespaces delete <id>')
	.describe('Delete a KV namespace')
	.action(commands.ns.destroy)

	.parse(process.argv);
