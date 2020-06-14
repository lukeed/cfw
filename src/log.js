const $ = require('kleur');

const CFW = $.bold('[CFW]');
const SPACER = ' '.repeat(6);

function print(color, msg) {
	console.log($[color](CFW), msg.includes('\n') ? msg.replace(/(\r?\n)/g, '$1' + SPACER) : msg);
}

exports.log = msg => print('white', msg);
exports.warn = msg => print('yellow', msg);
exports.success = msg => print('green', msg);
exports.info = msg => print('cyan', msg);
exports.error = (msg, code=1) => {
	print('red', msg);
	process.exit(code);
};
