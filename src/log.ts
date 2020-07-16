import colors from 'kleur';

const SPACER = ' '.repeat(6);
const CFW = colors.bold('[CFW]');

function print(color: keyof colors.Kleur, msg: string): void {
	console.log(colors[color](CFW), msg.includes('\n') ? msg.replace(/(\r?\n)/g, '$1' + SPACER) : msg);
}

type Logger = (msg: string) => void;

export const log: Logger = msg => print('white', msg);
export const warn: Logger = msg => print('yellow', msg);
export const success: Logger = msg => print('green', msg);
export const info: Logger = msg => print('cyan', msg);

export function error(msg: string, code=1): void {
	print('red', msg);
	process.exit(code);
}
