#!/usr/bin/env node
const sade = require('sade');
const commands = require('./lib');
const { version } = require('./package');

sade('cfw')
	.version(version)
	.option('-C, --cwd', 'The relative working directory', '.')
	.option('-P, --profile', 'The CFW account profile to load')

	.command('build [dir] [output]')
	.describe('Compile the Worker(s) within a directory.')
	.option('-d, --dir', 'The directory containing Worker scripts', 'workers')
	.option('-o, --only', 'The list of Worker names to build; overrides `--ignore` list!')
	.option('-i, --ignore', 'The list of Worker names to skip')
	.option('-s, --single', 'The target is a single Worker')
	.action(commands.build)

	.command('deploy [output]')
	.describe('Deploy the built Worker(s) – requires you `build` first.')
	.option('-d, --dir', 'The directory containing Worker scripts', 'workers')
	.option('-o, --only', 'The list of Worker names to build; overrides `--ignore` list!')
	.option('-i, --ignore', 'The list of Worker names to skip')
	.option('-s, --single', 'The target is a single Worker')
	.action(commands.deploy)

	.command('secrets list').alias('secrets ls')
	.describe('List the names of secrets attached to Worker(s) within a directory.')
	.option('-d, --dir', 'The directory containing Worker scripts', 'workers')
	.option('-o, --only', 'The list of Worker names to query; overrides `--ignore` list!')
	.option('-i, --ignore', 'The list of Worker names to skip')
	.option('-s, --single', 'The target is a single Worker')
	.action(commands.secret.list)

	.command('secrets create <name> <value>')
	.alias('secrets new', 'secrets add', 'secrets put')
	.describe('Create a new secret for the Worker(s) within a directory.')
	.option('-d, --dir', 'The directory containing Worker scripts', 'workers')
	.option('-o, --only', 'The list of Worker names to query; overrides `--ignore` list!')
	.option('-i, --ignore', 'The list of Worker names to skip')
	.option('-s, --single', 'The target is a single Worker')
	.action(commands.secret.create)

	.command('secrets destroy <name>')
	.alias('secrets delete', 'secrets rm')
	.describe('Remove a secret from the Worker(s) within a directory.')
	.option('-d, --dir', 'The directory containing Worker scripts', 'workers')
	.option('-o, --only', 'The list of Worker names to query; overrides `--ignore` list!')
	.option('-q, --quiet', 'Do not throw error if Worker is missing secret')
	.option('-i, --ignore', 'The list of Worker names to skip')
	.option('-s, --single', 'The target is a single Worker')
	.action(commands.secret.destroy)

	.command('kv namespaces list')
	.describe('List all KV namespaces')
	.alias('kv ns list', 'kv ns ls')
	.action(commands.ns.list)

	.command('kv namespaces create <title>')
	.describe('Create a new KV namespace')
	.alias('kv ns create', 'kv ns new')
	.action(commands.ns.create)

	.command('kv namespaces destroy <id>')
	.describe('Destroy a KV namespace')
	.alias('kv ns delete', 'kv ns rm')
	.action(commands.ns.destroy)

	.parse(process.argv);
