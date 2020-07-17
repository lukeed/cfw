import { error } from '../log';
import { send, authorize } from './client';

// https://api.cloudflare.com/#workers-kv-namespace-list-namespaces
export function list(creds: Credentials) {
	const query = 'per_page=100&order=title';
	return send<Cloudflare.KV.Namespace.ALL>('GET', `/accounts/${creds.accountid}/storage/kv/namespaces?${query}`, {
		headers: authorize(creds)
	});
}

// https://api.cloudflare.com/#workers-kv-namespace-create-a-namespace
export function create(creds: Credentials, title: string) {
	return send<Cloudflare.KV.Namespace.CREATE>('POST', `/accounts/${creds.accountid}/storage/kv/namespaces`, {
		headers: authorize(creds),
		body: { title }
	}).catch(err => {
		error(`Error creating "${title}" namespace!\n${JSON.stringify(err.data || err.message, null, 2)}`);
	});
}

// https://api.cloudflare.com/#workers-kv-namespace-remove-a-namespace
export function destroy(creds: Credentials, nameid: string) {
	return send<Cloudflare.KV.Namespace.DELETE>('DELETE', `/accounts/${creds.accountid}/storage/kv/namespaces/${nameid}`, {
		headers: authorize(creds)
	}).catch(err => {
		error(`Error removing "${nameid}" namespace!\n${JSON.stringify(err.data || err.message, null, 2)}`);
	});
}
