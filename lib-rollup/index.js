var colors = require('kleur');
var fs = require('fs');
var premove = require('premove');
var lite = require('klona/lite');
var path = require('path');
var os = require('os');
var util = require('util');
var httpie = require('httpie');

const options = {
    resolve: {
        mainFields: ['worker', 'browser', 'module', 'jsnext', 'main']
    }
};
const config = {
    output: {
        format: 'esm',
        sourcemap: false,
    },
    treeshake: {
        propertyReadSideEffects: false,
        moduleSideEffects: 'no-external',
        tryCatchDeoptimization: false
    },
    plugins: []
};

const ARROW = '   ~> ';
const SPACER = ' '.repeat(6);
const CFW = colors.bold('[CFW]');
function print(color, msg) {
    console.log(colors[color](CFW), msg.includes('\n') ? msg.replace(/(\r?\n)/g, '$1' + SPACER) : msg);
}
const info = (msg) => print('white', msg);
const success = (msg) => print('green', msg);
const warn = (msg) => print('yellow', msg);
function error(msg, code = 1) {
    print('red', msg);
    process.exit(code);
}
const FLAG = colors.dim().bold;
function missing(text, opts) {
    if (opts.only || opts.ignore)
        text += `\nPerhaps the ${FLAG('--only')} or ${FLAG('--ignore')} flag needs adjusting`;
    return warn(text);
}
function time(ms) {
    return colors.italic().dim(` (${ms}ms)`);
}
function item(name, delta, isAdd) {
    let sym = '•', fn = colors.dim;
    let text = delta != null ? time(delta) : '';
    if (isAdd)
        (sym = '+', fn = colors.green().dim);
    else if (isAdd != null)
        (sym = '-', fn = colors.red().dim);
    console.log(fn(SPACER + sym + ` "${name}"`) + text);
}

const write = util.promisify(fs.writeFile);
const read = util.promisify(fs.readFile);
const assert = (mix, msg) => !!mix || error(msg);
const exists = (file, msg) => fs.existsSync(file) || error(msg);
function list$4(str) {
    return Array.isArray(str) ? str : str.split(',');
}
function load(str, dir) {
    str = path.resolve(dir || '.', str);
    return fs.existsSync(str) && require(str);
}
function toConfig(dir) {
    let tmp;
    if (tmp = load('cfw.js', dir))
        return tmp;
    if (tmp = load('cfw.json', dir))
        return tmp;
    if (tmp = load('package.json', dir))
        return tmp.cfw;
}
function toWorkerData(dir, name, isOne) {
    let abs = isOne ? dir : path.join(dir, name);
    let config = toConfig(abs) || {};
    return {
        cfw: config,
        name: config.name || name,
        input: path.join(abs, config.entry || 'index.js'),
        abs,
    };
}
function toWorkers(dirname, opts) {
    opts.cwd = path.resolve(opts.cwd);
    let dir = path.resolve(opts.cwd, dirname);
    exists(dir, `Workers directory does not exist: "${dir}"`);
    let items;
    let conf;
    let { cwd, single, only, ignore } = opts;
    if (single) {
        let name = opts.dir;
        if (name === '.')
            name = path.parse(cwd).base;
        let obj = toWorkerData(dir, name, true);
        if (conf = toConfig(cwd)) {
            Object.assign(obj.cfw, conf);
            if (conf.name)
                obj.name = conf.name;
            if (opts.profile)
                obj.cfw.profile = opts.profile;
        }
        return [obj];
    }
    let arr = fs.readdirSync(dir).map(x => toWorkerData(dir, x));
    if (only) {
        items = list$4(only);
        return arr.filter(obj => items.includes(obj.name));
    }
    if (ignore) {
        items = list$4(ignore);
        return arr.filter(obj => !items.includes(obj.name));
    }
    return arr;
}
async function toProfile(profile = 'default') {
    let file = path.join(os.homedir(), '.cfw', 'config');
    exists(file, `Missing "${file}" config file`);
    let data = await read(file, 'utf8');
    let tmp, map = {};
    let i = 0, name, rgx = /^\[(.*)\]$/;
    let arr = data.split(/(\r?\n)+/g);
    for (; i < arr.length; i++) {
        if (arr[i].startsWith('#') || !arr[i].trim().length) ;
        else if (rgx.test(arr[i])) {
            name = rgx.exec(arr[i])[1];
            tmp = map[name] = {};
        }
        else {
            let [k, v] = arr[i].split('=');
            tmp[k.trim()] = v.trim();
        }
    }
    let out = map[profile];
    assert(out, `The "${profile}" profile is not defined`);
    return out;
}
async function toCredentials(def, loose) {
    let { CLOUDFLARE_ZONEID, CLOUDFLARE_ACCOUNTID, CLOUDFLARE_AUTH_EMAIL, CLOUDFLARE_AUTH_KEY, CLOUDFLARE_TOKEN } = process.env;
    let email = CLOUDFLARE_AUTH_EMAIL || def.email;
    let authkey = CLOUDFLARE_AUTH_KEY || def.authkey;
    let accountid = CLOUDFLARE_ACCOUNTID || def.accountid;
    let zoneid = CLOUDFLARE_ZONEID || def.zoneid;
    let token = CLOUDFLARE_TOKEN || def.token;
    let hasAuth = token || (authkey && email);
    if (hasAuth && accountid && zoneid) {
        return { authkey, accountid, email, token, zoneid };
    }
    if (def.profile) {
        let extra = await toProfile(def.profile);
        Object.keys(extra).forEach((key) => {
            if (!email && /CLOUDFLARE_AUTH_EMAIL/i.test(key))
                email = extra[key];
            if (!accountid && /CLOUDFLARE_ACCOUNTID/i.test(key))
                accountid = extra[key];
            if (!authkey && /CLOUDFLARE_AUTH_KEY/i.test(key))
                authkey = extra[key];
            if (!zoneid && /CLOUDFLARE_ZONEID/i.test(key))
                zoneid = extra[key];
            if (!token && /CLOUDFLARE_TOKEN/i.test(key))
                token = extra[key];
        });
    }
    assert(zoneid || loose, 'Missing Cloudflare "zoneid" value!');
    assert(accountid, 'Missing Cloudflare "accountid" value!');
    if (token || (authkey && email)) ;
    else if (authkey || email) {
        assert(email, 'Missing Cloudflare "email" value!');
        assert(authkey, 'Missing Cloudflare "authkey" value!');
    }
    else {
        error('Missing Cloudflare "token" value or "email" + "authkey" combo!');
    }
    return { authkey, accountid, email, token, zoneid };
}
const rand = () => Math.random().toString(36).slice(2);
function multipart(boundary, dict) {
    let key, tmp, content = '';
    let NL = '\r\n', BOUND = '--' + boundary;
    for (key in dict) {
        tmp = dict[key];
        content += BOUND + NL;
        content += `Content-Disposition: form-data; name="${key}"`;
        if (tmp.filename)
            content += `; filename="${tmp.filename}"`;
        if (tmp.type)
            content += NL + `Content-Type: ${tmp.type}`;
        content += NL + NL + tmp.value + NL;
    }
    return content + BOUND + '--';
}

async function build (src, output, opts) {
    opts.dir = src || opts.dir;
    let items = toWorkers(opts.dir, opts);
    if (!items.length)
        return missing('Nothing to build!', opts);
    let buildDir = output || 'build';
    src = path.resolve(opts.cwd, opts.dir);
    output = path.resolve(opts.cwd, buildDir);
    if (fs.existsSync(output)) {
        warn(`Removing existing "${buildDir}" directory`);
        await premove.premove(output);
    }
    const { rollup } = require('rollup');
    let arrow = colors.cyan(ARROW);
    let count = colors.bold(items.length);
    let sfx = items.length === 1 ? '' : 's';
    info(`Building ${count} worker${sfx}:`);
    for (let def of items) {
        let { name, input, cfw } = def;
        let options$1 = lite.klona(options);
        let config$1 = { input, ...config };
        let outdir = path.join(output, opts.single ? '' : name);
        config$1.output.file = path.join(outdir, 'index.js');
        if (typeof cfw.build === 'function') {
            config$1 = lite.klona(config$1);
            cfw.build(config$1, options$1);
        }
        config$1.plugins.push(require('@rollup/plugin-node-resolve').default(options$1.resolve));
        let now = Date.now();
        try {
            await rollup(config$1).then((bun) => {
                return bun.write(config$1.output);
            });
        }
        catch (err) {
            return error(err.stack || err.message);
        }
        await write(path.join(outdir, 'cfw.json'), JSON.stringify({ name, ...cfw }, null, 2));
        console.log(arrow + name + time(Date.now() - now));
    }
    success(`Build complete!\nYour worker${sfx} ${items.length === 1 ? 'is' : 'are'} ready for deployment 🎉`);
}

function authorize(creds, headers = {}) {
    if (creds.token) {
        headers['Authorization'] = `Bearer ${creds.token}`;
    }
    else {
        headers['X-Auth-Key'] = creds.authkey;
        headers['X-Auth-Email'] = creds.email;
    }
    return headers;
}
const API = 'https://api.cloudflare.com/client/v4';
function send(method, pathname, opts = {}) {
    return httpie.send(method, API + pathname, opts).then(r => r.data);
}

function route(creds, pattern, script) {
    return send('POST', `/zones/${creds.zoneid}/workers/routes`, {
        headers: authorize(creds, { 'Content-Type': 'application/javascript' }),
        body: { pattern, script }
    }).catch(err => {
        let { data, message } = err;
        if (data && data.errors && data.errors[0].code === 10020)
            return;
        error(`Error setting "${pattern}" route pattern!\n${JSON.stringify(data || message, null, 2)}`);
    });
}
async function script(creds, worker, filedata, metadata) {
    const boundary = '----' + rand() + rand();
    const content = multipart(boundary, {
        script: {
            type: 'application/javascript',
            value: filedata,
        },
        metadata: {
            type: 'application/json',
            value: metadata ? JSON.stringify(metadata) : '{"body_part": "script","bindings":[]}'
        }
    });
    return send('PUT', `/accounts/${creds.accountid}/workers/scripts/${worker}`, {
        headers: authorize(creds, { 'Content-Type': `multipart/form-data; boundary=${boundary}` }),
        body: content
    }).catch(err => {
        error(`Error uploading "${worker}" script!\n${JSON.stringify(err.data || err.message, null, 2)}`);
    });
}

const TYPES = {
    env: 'plain_text',
    wasm: 'wasm_module',
    secret: 'secret_text',
    kv: 'kv_namespace',
};
function binding(name, input) {
    let idx = input.indexOf(':');
    let hint = input.substring(0, idx);
    let value = input.substring(idx + 1);
    let type = TYPES[hint.toLowerCase()];
    if (!type)
        error(`Unknown binding hint: "${hint}"`);
    if (type === 'wasm_module') {
        return { type, name, part: 'wasm' };
    }
    if (type === 'kv_namespace') {
        return { type, name, namespace_id: value };
    }
    return { type, name, text: value };
}
function metadata(dict) {
    let key, arr = [];
    for (key in dict)
        arr.push(binding(key, dict[key]));
    if (arr.length)
        return { body_part: 'script', bindings: arr };
}

async function deploy (output, opts) {
    let buildDir = output || 'build';
    let items = toWorkers(buildDir, opts);
    if (!items.length)
        return missing('Nothing to deploy!', opts);
    let arrow = colors.cyan(ARROW);
    let count = colors.bold(items.length);
    let sfx = items.length === 1 ? '' : 's';
    info(`Deploying ${count} worker${sfx}:`);
    for (let def of items) {
        let { name, input, cfw } = def;
        cfw.profile = cfw.profile || opts.profile;
        exists(input, `Worker input does not exist: "${input}"`);
        let creds = await toCredentials(cfw);
        let metadata$1 = cfw.globals && metadata(cfw.globals);
        let filedata = await read(input);
        let now = Date.now();
        await script(creds, name, filedata, metadata$1);
        console.log(arrow + name + time(Date.now() - now));
        if (cfw.routes) {
            await Promise.all(cfw.routes.map(str => {
                let iter = Date.now();
                let isNot = str.startsWith('!');
                let pattern = str.substring(+isNot);
                return route(creds, pattern, isNot ? null : name).then(() => {
                    item(pattern, Date.now() - iter, !isNot);
                });
            }));
        }
    }
    success(`Deployment complete!\nAll items within "${buildDir}" uploaded 🎉`);
}

function list$3(creds, worker) {
    return send('GET', `/accounts/${creds.accountid}/workers/scripts/${worker}/secrets`, {
        headers: authorize(creds)
    }).catch(err => {
        error(`Error fetching "${worker}" secrets!\n${JSON.stringify(err.data || err.message, null, 2)}`);
    });
}
function create$3(creds, worker, key, value) {
    return send('PUT', `/accounts/${creds.accountid}/workers/scripts/${worker}/secrets`, {
        headers: authorize(creds),
        body: {
            type: 'secret_text',
            text: value,
            name: key,
        }
    }).catch(err => {
        error(`Error creating new "${worker}" secret!\n${JSON.stringify(err.data || err.message, null, 2)}`);
    });
}
function destroy$3(creds, worker, name, quiet) {
    return send('DELETE', `/accounts/${creds.accountid}/workers/scripts/${worker}/secrets/${name}`, {
        headers: authorize(creds)
    }).catch(err => {
        let { data, message } = err;
        if (quiet && data && data.errors && data.errors[0].code === 10056)
            return data;
        error(`Error deleting "${worker}/${name}" secret!\n${JSON.stringify(data || message, null, 2)}`);
    });
}

async function list$2(opts) {
    let items = toWorkers(opts.dir, opts);
    if (!items.length)
        return missing('No workers found!', opts);
    let count = colors.bold(items.length);
    let sfx = items.length === 1 ? '' : 's';
    info(`Fetching secrets for ${count} worker${sfx}:`);
    let arrow = colors.cyan(ARROW);
    for (let def of items) {
        let { name, cfw } = def;
        cfw.profile = cfw.profile || opts.profile;
        let creds = await toCredentials(cfw);
        let res = await list$3(creds, name);
        console.log(arrow + `"${name}" secrets:`);
        if (res.result.length) {
            for (let tmp of res.result)
                item(tmp.name);
        }
        else {
            console.log(SPACER + colors.italic().dim(' None'));
        }
    }
    success(`Retrieved worker${sfx ? `s'` : `'s`} secrets`);
}
async function create$2(key, value, opts) {
    let items = toWorkers(opts.dir, opts);
    if (!items.length)
        return missing('No workers found!', opts);
    let arrow = colors.cyan(ARROW);
    let count = colors.bold(items.length);
    let sfx = items.length === 1 ? '' : 's';
    let toAdd = [];
    info(`Adding secret "${key}" value to ${count} worker${sfx}:`);
    for (let def of items) {
        let { name, cfw } = def;
        cfw.profile = cfw.profile || opts.profile;
        let creds = await toCredentials(cfw);
        toAdd.push(() => {
            let now = Date.now();
            return create$3(creds, name, key, value).then(res => {
                if (res.success)
                    console.log(arrow + name + time(Date.now() - now));
            });
        });
    }
    await Promise.all(toAdd.map(x => x()));
    success(`Added secret to worker${sfx}`);
}
async function destroy$2(key, opts) {
    let items = toWorkers(opts.dir, opts);
    if (!items.length)
        return missing('No workers found!', opts);
    let count = colors.bold(items.length);
    let sfx = items.length === 1 ? '' : 's';
    let toRem = [];
    info(`Removing "${key}" secret from ${count} worker${sfx}:`);
    for (let def of items) {
        let { name, cfw } = def;
        cfw.profile = cfw.profile || opts.profile;
        let creds = await toCredentials(cfw);
        toRem.push(() => {
            let now = Date.now();
            return destroy$3(creds, name, key, !!opts.quiet).then(res => {
                let arrow = (res.success ? colors.cyan : colors.red)(ARROW);
                console.log(arrow + name + time(Date.now() - now));
            });
        });
    }
    await Promise.all(toRem.map(x => x()));
    success(`Removed secret from worker${sfx}`);
}

var secrets = {
	__proto__: null,
	list: list$2,
	create: create$2,
	destroy: destroy$2
};

function list$1(creds) {
    const query = 'per_page=100&order=title';
    return send('GET', `/accounts/${creds.accountid}/storage/kv/namespaces?${query}`, {
        headers: authorize(creds)
    });
}
function create$1(creds, title) {
    return send('POST', `/accounts/${creds.accountid}/storage/kv/namespaces`, {
        headers: authorize(creds),
        body: { title }
    }).catch(err => {
        error(`Error creating "${title}" namespace!\n${JSON.stringify(err.data || err.message, null, 2)}`);
    });
}
function destroy$1(creds, nameid) {
    return send('DELETE', `/accounts/${creds.accountid}/storage/kv/namespaces/${nameid}`, {
        headers: authorize(creds)
    }).catch(err => {
        error(`Error removing "${nameid}" namespace!\n${JSON.stringify(err.data || err.message, null, 2)}`);
    });
}

async function list(opts) {
    const creds = await toCredentials(opts, true);
    info('Retrieving KV namespaces:');
    const items = await list$1(creds);
    const GAP = '    ', TH = colors.dim().bold().italic;
    success(TH('ID') + ' '.repeat(30) + GAP + TH('Title'));
    let i = 0, arr = items.result, tmp = '';
    for (; i < arr.length; i++) {
        if (tmp)
            tmp += '\n';
        tmp += (arr[i].supports_url_encoding ? colors.cyan : colors.red)(ARROW);
        tmp += arr[i].id + GAP + arr[i].title;
    }
    console.log(tmp);
}
async function create(title, opts) {
    const creds = await toCredentials(opts, true);
    info('Creating new KV namespace:');
    const res = await create$1(creds, title);
    if (!res)
        return error('Error creating namespace');
    console.log(colors.cyan(ARROW) + `"${res.result.title}"  ` + colors.italic().dim(`(ID: ${res.result.id})`));
    success('KV namespace created!');
}
async function destroy(nameid, opts) {
    const creds = await toCredentials(opts, true);
    warn('Deleting KV namespace');
    const res = await destroy$1(creds, nameid);
    if (!res || !res.success)
        return error('Error deleting namespace');
    success('KV namespace deleted!');
}

var names = {
	__proto__: null,
	list: list,
	create: create,
	destroy: destroy
};

exports.build = build;
exports.deploy = deploy;
exports.ns = names;
exports.secret = secrets;
