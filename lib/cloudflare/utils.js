const { send } = require('httpie');

const API = 'https://api.cloudflare.com/client/v4';

exports.toHeaders = function (creds, obj={}) {
	const headers = obj;

	if (creds.token) {
		headers['Authorization'] = `Bearer ${creds.token}`;
	} else {
		headers['X-Auth-Key'] = creds.authkey;
		headers['X-Auth-Email'] = creds.email;
	}

	return headers;
}

exports.send = function (method, pathname, opts={}) {
	return send(method, API + pathname, opts).then(r => r.data);
}
