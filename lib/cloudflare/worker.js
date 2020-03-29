const { error } = require('../log');
const { send, toHeaders } = require('./utils');

exports.route = function (pattern, script, creds) {
	return send('POST', `/zones/${creds.zoneid}/workers/routes`, {
		headers: toHeaders(creds, {
			'Content-Type': 'application/javascript',
		}),
		body: {
			pattern,
			script
		}
	}).catch(err => {
		let { data, message } = err;
		if (data && data.errors && data.errors[0].code === 10020) return; // duplicate
		error(`Error setting "${pattern}" route pattern!\n${JSON.stringify(data || message, null, 2)}`);
	});
}

exports.script = function (filedata, name, creds) {
	return send('PUT', `/accounts/${creds.accountid}/workers/scripts/${name}`, {
		headers: toHeaders(creds, {
			'Content-Type': 'application/javascript',
		}),
		body: filedata
	}).catch(err => {
		error(`Error uploading "${name}" script!\n${JSON.stringify(err.data || err.message, null, 2)}`);
	});
}
