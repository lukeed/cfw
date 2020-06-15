import colors from 'kleur';

const SPACER = ' '.repeat(6);
const CFW = colors.bold('[CFW]');

function print(color, msg) {
	console.log(colors[color](CFW), msg.includes('\n') ? msg.replace(/(\r?\n)/g, '$1' + SPACER) : msg);
}

export const log = msg => print('white', msg);
export const warn = msg => print('yellow', msg);
export const success = msg => print('green', msg);
export const info = msg => print('cyan', msg);
export function error(msg, code=1) {
	print('red', msg);
	process.exit(code);
}
