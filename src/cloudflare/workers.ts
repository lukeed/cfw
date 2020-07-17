import { error } from '../log';
import { send, authorize } from './client';

// https://api.cloudflare.com/#worker-routes-create-route
export function route(creds: Credentials, pattern: string, script: Nullable<string>) {
	return send<Cloudflare.Worker.Route.CREATE>('POST', `/zones/${creds.zoneid}/workers/routes`, {
		headers: authorize(creds, { 'Content-Type': 'application/javascript' }),
		body: { pattern, script }
	}).catch(err => {
		let { data, message } = err;
		if (data && data.errors && data.errors[0].code === 10020) return; // duplicate
		error(`Error setting "${pattern}" route pattern!\n${JSON.stringify(data || message, null, 2)}`);
	});
}

// https://api.cloudflare.com/#worker-script-upload-worker
export function script(creds: Credentials, name: string, filedata: string) {
	return send<Cloudflare.Worker.Script.UPLOAD>('PUT', `/accounts/${creds.accountid}/workers/scripts/${name}`, {
		headers: authorize(creds, { 'Content-Type': 'application/javascript' }),
		body: filedata
	}).catch(err => {
		error(`Error uploading "${name}" script!\n${JSON.stringify(err.data || err.message, null, 2)}`);
	});
}
