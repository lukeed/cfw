import { error } from '../log';
import { send, authorize } from './client';

// @see https://api.cloudflare.com/#worker-subdomain-get-subdomain
export function get(creds: Credentials): Promise<string> {
	return send<Cloudflare.Worker.Subdomain.GET>('GET', `/accounts/${creds.accountid}/workers/subdomain`, {
		headers: authorize(creds)
	}).then(res => {
		let subdomain = res.success && res.result.subdomain;
		if (subdomain) return `${subdomain}.workers.dev`;
		return error('You must register a subdomain!');
	}).catch(err => {
		error(`Error fetching your workers.dev subdomain!\n${JSON.stringify(err.data || err.message, null, 2)}`);
	});
}

export function toggle(creds: Credentials, worker: string, enabled: boolean) {
	let path = `/accounts/${creds.accountid}/workers/scripts/${worker}/subdomain`;
	return send<Cloudflare.Worker.Subdomain.TOGGLE>('POST', path, {
		headers: authorize(creds),
		body: { enabled }
	}).catch(err => {
		error(`Error publishing "${worker}" to workers.dev subdomain!\n${JSON.stringify(err.data || err.message, null, 2)}`);
	});
}
