// src/commands/secrets.ts
import colors2 from "kleur";

// src/cloudflare/client.ts
import {send as http} from "httpie";
function authorize(creds, headers = {}) {
  if (creds.token) {
    headers["Authorization"] = `Bearer ${creds.token}`;
  } else {
    headers["X-Auth-Key"] = creds.authkey;
    headers["X-Auth-Email"] = creds.email;
  }
  return headers;
}
var API = "https://api.cloudflare.com/client/v4";
function send(method, pathname, opts = {}) {
  return http(method, API + pathname, opts).then((r) => r.data);
}

// src/log.ts
import colors from "kleur";
var ARROW = "   ~> ";
var SPACER = " ".repeat(6);
var CFW = colors.bold("[CFW]");
function print(color, msg) {
  console.log(colors[color](CFW), msg.includes("\n") ? msg.replace(/(\r?\n)/g, "$1" + SPACER) : msg);
}
var info = (msg) => print("white", msg);
var success = (msg) => print("green", msg);
var warn = (msg) => print("yellow", msg);
function error(msg, code = 1) {
  print("red", msg);
  process.exit(code);
}
var FLAG = colors.dim().bold;
function missing(text, opts) {
  if (opts.only || opts.ignore)
    text += `
Perhaps the ${FLAG("--only")} or ${FLAG("--ignore")} flag needs adjusting`;
  return warn(text);
}
function time(ms) {
  return colors.italic().dim(` (${ms}ms)`);
}
function item(name, delta, isAdd) {
  let sym = "•", fn = colors.dim;
  let text = delta != null ? time(delta) : "";
  if (isAdd)
    sym = "+", fn = colors.green().dim;
  else if (isAdd != null)
    sym = "-", fn = colors.red().dim;
  console.log(fn(SPACER + sym + ` "${name}"`) + text);
}

// src/cloudflare/secrets.ts
function list(creds, worker) {
  return send("GET", `/accounts/${creds.accountid}/workers/scripts/${worker}/secrets`, {
    headers: authorize(creds)
  }).catch((err) => {
    error(`Error fetching "${worker}" secrets!
${JSON.stringify(err.data || err.message, null, 2)}`);
  });
}
function create(creds, worker, key, value) {
  return send("PUT", `/accounts/${creds.accountid}/workers/scripts/${worker}/secrets`, {
    headers: authorize(creds),
    body: {
      type: "secret_text",
      text: value,
      name: key
    }
  }).catch((err) => {
    error(`Error creating new "${worker}" secret!
${JSON.stringify(err.data || err.message, null, 2)}`);
  });
}
function destroy(creds, worker, name, quiet) {
  return send("DELETE", `/accounts/${creds.accountid}/workers/scripts/${worker}/secrets/${name}`, {
    headers: authorize(creds)
  }).catch((err) => {
    let {data, message} = err;
    if (quiet && data && data.errors && data.errors[0].code === 10056)
      return data;
    error(`Error deleting "${worker}/${name}" secret!
${JSON.stringify(data || message, null, 2)}`);
  });
}

// src/util.ts
import {
  existsSync,
  readFile,
  readdirSync,
  writeFile
} from "fs";
import {homedir} from "os";
import {promisify} from "util";
import {parse, join, resolve} from "path";
var write = promisify(writeFile);
var read = promisify(readFile);
var assert = (mix, msg) => !!mix || error(msg);
var exists = (file, msg) => existsSync(file) || error(msg);
function list2(str) {
  return Array.isArray(str) ? str : str.split(",");
}
function load(str, dir) {
  str = resolve(dir || ".", str);
  return existsSync(str) && require(str);
}
function toConfig(dir) {
  let tmp;
  if (tmp = load("cfw.js", dir))
    return tmp;
  if (tmp = load("cfw.json", dir))
    return tmp;
  if (tmp = load("package.json", dir))
    return tmp.cfw;
}
function toWorkerData(dir, name, isOne) {
  let abs = isOne ? dir : join(dir, name);
  let config = toConfig(abs) || {};
  return {
    cfw: config,
    name: config.name || name,
    input: join(abs, config.entry || "index.js"),
    abs
  };
}
function toWorkers(dirname, opts) {
  opts.cwd = resolve(opts.cwd);
  let dir = resolve(opts.cwd, dirname);
  exists(dir, `Workers directory does not exist: "${dir}"`);
  let items;
  let conf;
  let {cwd, single, only, ignore} = opts;
  if (single) {
    let name = opts.dir;
    if (name === ".")
      name = parse(cwd).base;
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
  let arr = readdirSync(dir).map((x) => toWorkerData(dir, x));
  if (only) {
    items = list2(only);
    return arr.filter((obj) => items.includes(obj.name));
  }
  if (ignore) {
    items = list2(ignore);
    return arr.filter((obj) => !items.includes(obj.name));
  }
  return arr;
}
async function toProfile(profile = "default") {
  let file = join(homedir(), ".cfw", "config");
  exists(file, `Missing "${file}" config file`);
  let data = await read(file, "utf8");
  let tmp, map = {};
  let i = 0, name, rgx = /^\[(.*)\]$/;
  let arr = data.split(/(\r?\n)+/g);
  for (; i < arr.length; i++) {
    if (arr[i].startsWith("#") || !arr[i].trim().length) {
    } else if (rgx.test(arr[i])) {
      name = rgx.exec(arr[i])[1];
      tmp = map[name] = {};
    } else {
      let [k, v] = arr[i].split("=");
      tmp[k.trim()] = v.trim();
    }
  }
  let out = map[profile];
  assert(out, `The "${profile}" profile is not defined`);
  return out;
}
async function toCredentials(def, loose) {
  let {
    CLOUDFLARE_ZONEID,
    CLOUDFLARE_ACCOUNTID,
    CLOUDFLARE_AUTH_EMAIL,
    CLOUDFLARE_AUTH_KEY,
    CLOUDFLARE_TOKEN
  } = process.env;
  let email = CLOUDFLARE_AUTH_EMAIL || def.email;
  let authkey = CLOUDFLARE_AUTH_KEY || def.authkey;
  let accountid = CLOUDFLARE_ACCOUNTID || def.accountid;
  let zoneid = CLOUDFLARE_ZONEID || def.zoneid;
  let token = CLOUDFLARE_TOKEN || def.token;
  let hasAuth = token || authkey && email;
  if (hasAuth && accountid && zoneid) {
    return {authkey, accountid, email, token, zoneid};
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
  if (token || authkey && email) {
  } else if (authkey || email) {
    assert(email, 'Missing Cloudflare "email" value!');
    assert(authkey, 'Missing Cloudflare "authkey" value!');
  } else {
    error('Missing Cloudflare "token" value or "email" + "authkey" combo!');
  }
  return {authkey, accountid, email, token, zoneid};
}
var rand = () => Math.random().toString(36).slice(2);
function multipart(boundary, dict) {
  let key, tmp, content = "";
  let NL = "\r\n", BOUND = "--" + boundary;
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
  return content + BOUND + "--";
}

// src/commands/secrets.ts
async function list3(opts) {
  let items = toWorkers(opts.dir, opts);
  if (!items.length)
    return missing("No workers found!", opts);
  let count = colors2.bold(items.length);
  let sfx = items.length === 1 ? "" : "s";
  info(`Fetching secrets for ${count} worker${sfx}:`);
  let arrow = colors2.cyan(ARROW);
  for (let def of items) {
    let {name, cfw} = def;
    cfw.profile = cfw.profile || opts.profile;
    let creds = await toCredentials(cfw);
    let res = await list(creds, name);
    console.log(arrow + `"${name}" secrets:`);
    if (res.result.length) {
      for (let tmp of res.result)
        item(tmp.name);
    } else {
      console.log(SPACER + colors2.italic().dim(" None"));
    }
  }
  success(`Retrieved worker${sfx ? `s'` : `'s`} secrets`);
}
async function create2(key, value, opts) {
  let items = toWorkers(opts.dir, opts);
  if (!items.length)
    return missing("No workers found!", opts);
  let arrow = colors2.cyan(ARROW);
  let count = colors2.bold(items.length);
  let sfx = items.length === 1 ? "" : "s";
  let toAdd = [];
  info(`Adding secret "${key}" value to ${count} worker${sfx}:`);
  for (let def of items) {
    let {name, cfw} = def;
    cfw.profile = cfw.profile || opts.profile;
    let creds = await toCredentials(cfw);
    toAdd.push(() => {
      let now = Date.now();
      return create(creds, name, key, value).then((res) => {
        if (res.success)
          console.log(arrow + name + time(Date.now() - now));
      });
    });
  }
  await Promise.all(toAdd.map((x) => x()));
  success(`Added secret to worker${sfx}`);
}
async function destroy2(key, opts) {
  let items = toWorkers(opts.dir, opts);
  if (!items.length)
    return missing("No workers found!", opts);
  let count = colors2.bold(items.length);
  let sfx = items.length === 1 ? "" : "s";
  let toRem = [];
  info(`Removing "${key}" secret from ${count} worker${sfx}:`);
  for (let def of items) {
    let {name, cfw} = def;
    cfw.profile = cfw.profile || opts.profile;
    let creds = await toCredentials(cfw);
    toRem.push(() => {
      let now = Date.now();
      return destroy(creds, name, key, !!opts.quiet).then((res) => {
        let arrow = (res.success ? colors2.cyan : colors2.red)(ARROW);
        console.log(arrow + name + time(Date.now() - now));
      });
    });
  }
  await Promise.all(toRem.map((x) => x()));
  success(`Removed secret from worker${sfx}`);
}

// src/commands/names.ts
import colors3 from "kleur";

// src/cloudflare/names.ts
function list4(creds) {
  const query = "per_page=100&order=title";
  return send("GET", `/accounts/${creds.accountid}/storage/kv/namespaces?${query}`, {
    headers: authorize(creds)
  });
}
function create3(creds, title) {
  return send("POST", `/accounts/${creds.accountid}/storage/kv/namespaces`, {
    headers: authorize(creds),
    body: {title}
  }).catch((err) => {
    error(`Error creating "${title}" namespace!
${JSON.stringify(err.data || err.message, null, 2)}`);
  });
}
function destroy3(creds, nameid) {
  return send("DELETE", `/accounts/${creds.accountid}/storage/kv/namespaces/${nameid}`, {
    headers: authorize(creds)
  }).catch((err) => {
    error(`Error removing "${nameid}" namespace!
${JSON.stringify(err.data || err.message, null, 2)}`);
  });
}

// src/commands/names.ts
async function list5(opts) {
  const creds = await toCredentials(opts, true);
  info("Retrieving KV namespaces:");
  const items = await list4(creds);
  const GAP = "    ", TH = colors3.dim().bold().italic;
  success(TH("ID") + " ".repeat(30) + GAP + TH("Title"));
  let i = 0, arr = items.result, tmp = "";
  for (; i < arr.length; i++) {
    if (tmp)
      tmp += "\n";
    tmp += (arr[i].supports_url_encoding ? colors3.cyan : colors3.red)(ARROW);
    tmp += arr[i].id + GAP + arr[i].title;
  }
  console.log(tmp);
}
async function create4(title, opts) {
  const creds = await toCredentials(opts, true);
  info("Creating new KV namespace:");
  const res = await create3(creds, title);
  if (!res)
    return error("Error creating namespace");
  console.log(colors3.cyan(ARROW) + `"${res.result.title}"  ` + colors3.italic().dim(`(ID: ${res.result.id})`));
  success("KV namespace created!");
}
async function destroy4(nameid, opts) {
  const creds = await toCredentials(opts, true);
  warn("Deleting KV namespace");
  const res = await destroy3(creds, nameid);
  if (!res || !res.success)
    return error("Error deleting namespace");
  success("KV namespace deleted!");
}

// src/commands/build.ts
import colors4 from "kleur";
import {existsSync as existsSync2} from "fs";
import {premove} from "premove";
import {klona} from "klona/json";
import {join as join2, resolve as resolve2} from "path";
var defaults = {
  bundle: true,
  format: "esm",
  charset: "utf8",
  sourcemap: false,
  outfile: "<injected>",
  entryPoints: ["<injected>"],
  resolveExtensions: [".tsx", ".ts", ".jsx", ".mjs", ".js", ".json"],
  mainFields: ["worker", "browser", "module", "jsnext", "main"],
  conditions: ["worker", "browser", "import", "production"]
};
async function build_default(src, output, opts) {
  opts.dir = src || opts.dir;
  let items = toWorkers(opts.dir, opts);
  if (!items.length)
    return missing("Nothing to build!", opts);
  let buildDir = output || "build";
  output = resolve2(opts.cwd, buildDir);
  src = resolve2(opts.cwd, opts.dir);
  if (existsSync2(output)) {
    warn(`Removing existing "${buildDir}" directory`);
    await premove(output);
  }
  const esbuild = await import("esbuild");
  let arrow = colors4.cyan(ARROW);
  let count = colors4.bold(items.length);
  let sfx = items.length === 1 ? "" : "s";
  info(`Building ${count} worker${sfx}:`);
  for (let def of items) {
    let config = klona(defaults);
    let {name, input, cfw} = def;
    config.entryPoints = [input];
    let outdir = join2(output, opts.single ? "" : name);
    config.outfile = join2(outdir, "index.js");
    if (typeof cfw.build === "function") {
      cfw.build(config);
    }
    try {
      var now = Date.now();
      let result = await esbuild.build(config);
      result.warnings.forEach((msg) => {
        console.warn("TODO", msg);
      });
    } catch (err) {
      return error(err.stack || err.message);
    }
    await write(join2(outdir, "cfw.json"), JSON.stringify({name, ...cfw}, null, 2));
    console.log(arrow + name + time(Date.now() - now));
  }
  success(`Build complete!
Your worker${sfx} ${items.length === 1 ? "is" : "are"} ready for deployment 🎉`);
}

// src/commands/deploy.ts
import colors5 from "kleur";

// src/cloudflare/workers.ts
function route(creds, pattern, script2) {
  return send("POST", `/zones/${creds.zoneid}/workers/routes`, {
    headers: authorize(creds, {"Content-Type": "application/javascript"}),
    body: {pattern, script: script2}
  }).catch((err) => {
    let {data, message} = err;
    if (data && data.errors && data.errors[0].code === 10020)
      return;
    error(`Error setting "${pattern}" route pattern!
${JSON.stringify(data || message, null, 2)}`);
  });
}
async function script(creds, worker, filedata, metadata2) {
  const boundary = "----" + rand() + rand();
  const content = multipart(boundary, {
    script: {
      type: "application/javascript",
      value: filedata
    },
    metadata: {
      type: "application/json",
      value: metadata2 ? JSON.stringify(metadata2) : '{"body_part": "script","bindings":[]}'
    }
  });
  return send("PUT", `/accounts/${creds.accountid}/workers/scripts/${worker}`, {
    headers: authorize(creds, {"Content-Type": `multipart/form-data; boundary=${boundary}`}),
    body: content
  }).catch((err) => {
    error(`Error uploading "${worker}" script!
${JSON.stringify(err.data || err.message, null, 2)}`);
  });
}

// src/cloudflare/globals.ts
var TYPES = {
  env: "plain_text",
  wasm: "wasm_module",
  secret: "secret_text",
  kv: "kv_namespace"
};
function binding(name, input) {
  let idx = input.indexOf(":");
  let hint = input.substring(0, idx);
  let value = input.substring(idx + 1);
  let type = TYPES[hint.toLowerCase()];
  if (!type)
    error(`Unknown binding hint: "${hint}"`);
  if (type === "wasm_module") {
    return {type, name, part: "wasm"};
  }
  if (type === "kv_namespace") {
    return {type, name, namespace_id: value};
  }
  return {type, name, text: value};
}
function metadata(dict) {
  let key, arr = [];
  for (key in dict)
    arr.push(binding(key, dict[key]));
  if (arr.length)
    return {body_part: "script", bindings: arr};
}

// src/commands/deploy.ts
async function deploy_default(output, opts) {
  let buildDir = output || "build";
  let items = toWorkers(buildDir, opts);
  if (!items.length)
    return missing("Nothing to deploy!", opts);
  let arrow = colors5.cyan(ARROW);
  let count = colors5.bold(items.length);
  let sfx = items.length === 1 ? "" : "s";
  info(`Deploying ${count} worker${sfx}:`);
  for (let def of items) {
    let {name, input, cfw} = def;
    cfw.profile = cfw.profile || opts.profile;
    exists(input, `Worker input does not exist: "${input}"`);
    let creds = await toCredentials(cfw);
    let metadata2 = cfw.globals && metadata(cfw.globals);
    let filedata = await read(input);
    let now = Date.now();
    await script(creds, name, filedata, metadata2);
    console.log(arrow + name + time(Date.now() - now));
    if (cfw.routes) {
      await Promise.all(cfw.routes.map((str) => {
        let iter = Date.now();
        let isNot = str.startsWith("!");
        let pattern = str.substring(+isNot);
        return route(creds, pattern, isNot ? null : name).then(() => {
          item(pattern, Date.now() - iter, !isNot);
        });
      }));
    }
  }
  success(`Deployment complete!
All items within "${buildDir}" uploaded 🎉`);
}

// src/index.ts
var secret = {list: list3, create: create2, destroy: destroy2};
var ns = {list: list5, create: create4, destroy: destroy4};
export {
  build_default as build,
  deploy_default as deploy,
  ns,
  secret
};
