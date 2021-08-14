import { error } from '../log';
import { rand, multipart } from '../util';
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
export async function script(creds: Credentials, worker: string, filedata: Buffer, metadata: Cloudflare.Worker.Metadata | void) {
	const boundary = '----' + rand() + rand();

	const content = multipart(boundary, {
		script: {
			type: 'application/javascript',
			value: filedata,
		},
		metadata: {
			type: 'application/json',
			value: JSON.stringify(metadata),
		}
	});

	return send<Cloudflare.Worker.Script.UPLOAD>('PUT', `/accounts/${creds.accountid}/workers/scripts/${worker}`, {
		headers: authorize(creds, { 'Content-Type': `multipart/form-data; boundary=${boundary}` }),
		body: content
	}).catch(err => {
		error(`Error uploading "${worker}" script!\n${JSON.stringify(err.data || err.message, null, 2)}`);
	});
}
