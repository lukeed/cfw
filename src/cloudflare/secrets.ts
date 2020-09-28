import { authorize, send } from './client';
import { error } from '../log';

// https://github.com/cloudflare/cloudflare-rs/blob/358de27b95d0b840c973cce9bff197aae2660f84/cloudflare/src/endpoints/workers/list_secrets.rs#L13
export function list(creds: Credentials, worker: string) {
	return send<Cloudflare.Worker.Secret.ALL>('GET', `/accounts/${creds.accountid}/workers/scripts/${worker}/secrets`, {
		headers: authorize(creds)
	}).catch(err => {
		error(`Error fetching "${worker}" secrets!\n${JSON.stringify(err.data || err.message, null, 2)}`);
	});
}

// https://github.com/cloudflare/cloudflare-rs/blob/358de27b95d0b840c973cce9bff197aae2660f84/cloudflare/src/endpoints/workers/create_secret.rs#L16
export function create(creds: Credentials, worker: string, key: string, value: string) {
	return send<Cloudflare.Worker.Secret.CREATE>('PUT', `/accounts/${creds.accountid}/workers/scripts/${worker}/secrets`, {
		headers: authorize(creds),
		body: <Cloudflare.Worker.Binding>{
			type: 'secret_text',
			text: value,
			name: key,
		}
	}).catch(err => {
		error(`Error creating new "${worker}" secret!\n${JSON.stringify(err.data || err.message, null, 2)}`);
	});
}

// https://github.com/cloudflare/cloudflare-rs/blob/358de27b95d0b840c973cce9bff197aae2660f84/cloudflare/src/endpoints/workers/delete_secret.rs#L16
export function destroy(creds: Credentials, worker: string, name: string, quiet: boolean) {
	return send<Cloudflare.Worker.Secret.DELETE>('DELETE', `/accounts/${creds.accountid}/workers/scripts/${worker}/secrets/${name}`, {
		headers: authorize(creds)
	}).catch(err => {
		let { data, message } = err; // "workers.api.error.binding_not_found"
		if (quiet && data && data.errors && data.errors[0].code === 10056) return data as Cloudflare.Worker.Secret.DELETE;
		error(`Error deleting "${worker}/${name}" secret!\n${JSON.stringify(data || message, null, 2)}`);
	});
}
