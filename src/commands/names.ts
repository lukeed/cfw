import colors from 'kleur';
import * as NS from '../cloudflare/names';
import * as utils from '../util';
import * as log from '../log';

interface Argv {
	profile?: string;
}

export async function list(opts: Argv) {
	const creds = await utils.toCredentials(opts, true);
	log.info('Retrieving KV namespaces:');
	const items = await NS.list(creds);

	const GAP='    ', TH=colors.dim().bold().italic;
	log.success(TH('ID') + ' '.repeat(30) + GAP + TH('Title'));

	let i=0, arr=items.result, tmp=''; // ID => 32 chars
	for (; i < arr.length; i++) {
		if (tmp) tmp += '\n';
		tmp += (arr[i].supports_url_encoding ? colors.cyan : colors.red)(log.ARROW);
		tmp += arr[i].id + GAP + arr[i].title;
	}

	console.log(tmp);
}

export async function create(title: string, opts: Argv) {
	const creds = await utils.toCredentials(opts, true);

	log.info('Creating new KV namespace:');
	const res = await NS.create(creds, title);
	if (!res) return log.error('Error creating namespace');

	console.log(colors.cyan(log.ARROW) + `"${res.result.title}"  ` + colors.italic().dim(`(ID: ${res.result.id})`));
	log.success('KV namespace created!');
}

export async function destroy(nameid: string, opts: Argv) {
	const creds = await utils.toCredentials(opts, true);

	log.warn('Deleting KV namespace');
	const res = await NS.destroy(creds, nameid);
	if (!res || !res.success) return log.error('Error deleting namespace');

	log.success('KV namespace deleted!');
}
