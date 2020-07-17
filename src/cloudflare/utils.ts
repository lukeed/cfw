import { send as http } from 'httpie';

import type { HttpieOptions } from 'httpie';

const API = 'https://api.cloudflare.com/client/v4';

type IHeaders = Record<string, string>;
export function toHeaders(creds: Credentials, obj: IHeaders = {}): IHeaders {
	const headers = obj;

	if (creds.token) {
		headers['Authorization'] = `Bearer ${creds.token}`;
	} else {
		headers['X-Auth-Key'] = creds.authkey;
		headers['X-Auth-Email'] = creds.email;
	}

	return headers;
}

export function send<T>(method: string, pathname: string, opts: Partial<HttpieOptions> = {}): Promise<T> {
	return http<T>(method, API + pathname, opts).then(r => r.data);
}
