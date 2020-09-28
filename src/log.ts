import colors from 'kleur';

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
