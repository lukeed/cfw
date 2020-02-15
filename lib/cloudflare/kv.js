const { send, toHeaders } = require('./utils');
const { error } = require('../log');

exports.set = function (nameid, key, val, creds) {
	const k = encodeURIComponent(key);
	return send('PUT', `/accounts/${creds.accountid}/storage/kv/namespaces/${nameid}/values/${k}`, {
		headers: toHeaders(creds, {
			'Content-Type': 'text/plain'
		}),
		body: val
	}).catch(err => {
		console.log(err);
		error(`Error writing "${key}" value!\n${JSON.stringify(err.data || err.message, null, 2)}`);
	});
}

exports.create = function (title, creds) {
	return send('POST', `/accounts/${creds.accountid}/storage/kv/namespaces`, {
		headers: toHeaders(creds),
		body: { title }
	}).then(x => x.result).catch(err => {
		error(`Error creating "${title}" namespace!\n${JSON.stringify(err.data || err.message, null, 2)}`);
	});
}

exports.list = function (creds) {
	return send('GET', `/accounts/${creds.accountid}/storage/kv/namespaces`, {
		headers: toHeaders(creds)
	}).then(x => x.result);
}

exports.destroy = async function (nameid, creds) {
	return send('DELETE', `/accounts/${creds.accountid}/storage/kv/namespaces/${nameid}`, {
		headers: toHeaders(creds)
	}).catch(err => {
		error(`Error destroying "${nameid}" namespace!\n${JSON.stringify(err.data || err.message, null, 2)}`);
	})
}
