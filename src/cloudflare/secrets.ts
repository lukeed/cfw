// import { error } from '../log';
import { authorize, send } from './client';

// https://github.com/cloudflare/cloudflare-rs/blob/358de27b95d0b840c973cce9bff197aae2660f84/cloudflare/src/endpoints/workers/list_secrets.rs#L13
export function list(creds: Credentials, worker: string) {
	return send<Cloudflare.Worker.Secret.ALL>('GET', `/accounts/${creds.accountid}/workers/scripts/${worker}/secrets`, {
		headers: authorize(creds)
	});
}

// https://github.com/cloudflare/cloudflare-rs/blob/358de27b95d0b840c973cce9bff197aae2660f84/cloudflare/src/endpoints/workers/create_secret.rs#L16
export function create(creds: Credentials, worker: string, key: string, value: string) {
	return send('PUT', `/accounts/${creds.accountid}/workers/scripts/${worker}/secrets`, {
		headers: authorize(creds),
		body: <Cloudflare.Worker.Binding>{
			type: 'secret_text',
			text: value,
			name: key,
		}
	});
}

// https://github.com/cloudflare/cloudflare-rs/blob/358de27b95d0b840c973cce9bff197aae2660f84/cloudflare/src/endpoints/workers/delete_secret.rs#L16
export function destroy(creds: Credentials, worker: string, name: string) {
	return send('DELETE', `/accounts/${creds.accountid}/workers/scripts/${worker}/secrets/${name}`, {
		headers: authorize(creds)
	});
}
