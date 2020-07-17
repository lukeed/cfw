import { error } from '../log';

// globals: {
// 	APPS: 'KV:namespace_id',
// 	HELLO: 'ENV:example_value',
// 	FOOBAR: 'WASM:filepath.wasm(TODO)',
// 	WORLD: 'SECRET:example_secret',
// }

export const TYPES: Record<string, Cloudflare.Worker.Binding['type']> = {
	env: 'plain_text',
	wasm: 'wasm_module',
	secret: 'secret_text',
	kv: 'kv_namespace',
}

export function binding(name: string, input: string): Cloudflare.Worker.Binding {
	let idx = input.indexOf(':');
	let hint = input.substring(0, idx);
	let value = input.substring(idx + 1);

	let type = TYPES[hint.toLowerCase()];
	if (!type) error(`Unknown binding hint: "${hint}"`);

	if (type === 'wasm_module') {
		// todo: load file
		return { type, name, part: 'wasm' };
	}

	if (type === 'kv_namespace') {
		return { type, name, namespace_id: value };
	}

	return { type, name, text: value };
}

export function metadata(dict: Globals): Cloudflare.Worker.Metadata | void {
	let key, arr: Cloudflare.Worker.Binding[] = [];
	for (key in dict) arr.push(binding(key, dict[key]));
	if (arr.length) return { body_part: 'script', bindings: arr };
}
