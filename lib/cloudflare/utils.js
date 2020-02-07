const { send } = require('httpie');

const API = 'https://api.cloudflare.com/client/v4';

exports.toHeaders = function (creds, obj={}) {
	return {
		'X-Auth-Key': creds.authkey,
		'X-Auth-Email': creds.email,
		...obj
	};
}

exports.send = function (method, pathname, opts={}) {
	return send(method, API + pathname, opts).then(r => r.data);
}
