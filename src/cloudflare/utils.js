import { send as http } from 'httpie';

const API = 'https://api.cloudflare.com/client/v4';

export function toHeaders(creds, obj={}) {
	const headers = obj;

	if (creds.token) {
		headers['Authorization'] = `Bearer ${creds.token}`;
	} else {
		headers['X-Auth-Key'] = creds.authkey;
		headers['X-Auth-Email'] = creds.email;
	}

	return headers;
}

export function send(method, pathname, opts={}) {
	return http(method, API + pathname, opts).then(r => r.data);
}
