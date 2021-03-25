import colors from 'kleur';
import type { Message } from 'esbuild';

export const ARROW = '   ~> ';
export const SPACER = ' '.repeat(6);
const CFW = colors.bold('[CFW]');

function print(color: keyof colors.Kleur, msg: string): void {
	console.log(colors[color](CFW), msg.includes('\n') ? msg.replace(/(\r?\n)/g, '$1' + SPACER) : msg);
}

export const info = (msg: string) => print('white', msg);
export const success = (msg: string) => print('green', msg);
export const warn = (msg: string) => print('yellow', msg);

export function error(msg: string, code=1): never {
	print('red', msg);
	process.exit(code);
}

const FLAG = colors.dim().bold;
export function missing(text: string, opts: Partial<Options>) {
	if (opts.only || opts.ignore) text += `\nPerhaps the ${FLAG('--only')} or ${FLAG('--ignore')} flag needs adjusting`;
	return warn(text);
}

export function time(ms: number) {
	return colors.italic().dim(` (${ms}ms)`);
}

export function item(name: string, delta?: number, isAdd?: boolean) {
	let sym = '•', fn = colors.dim
	let text = delta != null ? time(delta) : '';
	if (isAdd) (sym='+', fn=colors.green().dim);
	else if (isAdd != null) (sym='-', fn=colors.red().dim);
	console.log( fn(SPACER + sym + ` "${name}"`) + text);
}

// format esbuild errors/warnings
export async function messages(arr: Message[], isError?: boolean) {
	let i=0, count=arr.length;
	if (count === i) return;

	const esbuild = await import('esbuild');

	let frames = await esbuild.formatMessages(arr, {
		terminalWidth: process.stdout.columns,
		kind: isError ? 'error' : 'warning',
		color: colors.enabled,
	});

	let rgx = /\x1b\[32m/g; // replace ANSI green
	let color = isError ? '\u001b[31m' : '\u001b[33m'; // red|yellow
	let fmt = isError ? colors.red : colors.yellow;

	let output = `Build ${isError ? 'failed' : 'finished'} with`;
	output += ' ' + colors.underline(count) + ' ';
	output += isError ? 'error' : 'warning';
	output += count === 1 ? ':' : 's:';
	output += '\n\n';

	for (; i < count; i++) {
		output += colors.bold().inverse( fmt(' ' + arr[i].location.file + ' ')) + ' ' + arr[i].text;
		output += frames[i].substring(frames[i].indexOf('\n')).replace(rgx, color);
	}

	i = output.length;
	if (output[--i] === '\n') {
		output = output.substring(0, i);
	}

	(isError ? error : warn)(output);
}
