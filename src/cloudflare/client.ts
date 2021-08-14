import { send as http } from 'httpie';

import type { HttpieOptions } from 'httpie';

export function authorize(creds: Credentials, headers: Record<string, string> = {}) {
	if (creds.token) {
		headers['Authorization'] = `Bearer ${creds.token}`;
	} else {
		headers['X-Auth-Key'] = creds.authkey!;
		headers['X-Auth-Email'] = creds.email!;
	}
	return headers;
}

const API = 'https://api.cloudflare.com/client/v4';

export function send<T>(method: string, pathname: string, opts: Partial<HttpieOptions> = {}): Promise<T> {
	return http<T>(method, API + pathname, opts).then(r => r.data);
}
