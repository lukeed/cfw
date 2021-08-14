declare namespace Cloudflare {
	interface Response {
		success: boolean;
		errors: string[];
		messages: string[];
	}

	interface Result<T> extends Response {
		result: T;
	}

	namespace Worker {
		interface Route {
			id: string;
			pattern: string;
			script: string;
		}

		namespace Route {
			type ALL = Result<Route[]>;
			type FIND = Result<Route>;
			type CREATE = Result<Pick<Route, 'id'>>;
			type UPDATE = Result<Route>;
			type DELETE = Result<Pick<Route, 'id'>>;
		}

		interface Subdomain {
			subdomain: string;
		}

		namespace Subdomain {
			type GET = Result<Subdomain>;
			type TOGGLE = Result<null>;
		}

		interface Script {
			etag: string;
			size: number;
			modified_on: string;
			usage_model: 'unbound' | 'bundled';
			script: string;
		}

		namespace Script {
			type ALL = Result<(Omit<Script, 'script'> & { id: string; created_on: string })[]>;
			type USAGE = Result<Pick<Script, 'usage_model'>>;
			type UPLOAD = Result<Script>;
			type DOWNLOAD = Script['script'];
		}

		interface Secret {
			name: string;
			type: 'secret_type';
			modified_on: string;
			created_on: string;
		}

		namespace Secret {
			type ALL = Result<Pick<Secret, 'name'|'type'>[]>;
			type CREATE = Result<Secret>;
			type DELETE = Response;
		}

		type Binding = {
			type: 'kv_namespace';
			namespace_id: KV.Namespace['id'];
			name: string;
		} | {
			type: 'wasm_module';
			part: 'wasm'; // TODO?
			name: string;
		} | {
			type: 'plain_text' | 'secret_text';
			name: string;
			text: string;
		};

		interface Metadata {
			bindings: Binding[];
			body_part?: string;
			usage_model?: Script['usage_model'];
			main_module?: string;
		}
	}

	namespace KV {
		interface Namespace {
			id: string;
			title: string;
			supports_url_encoding: boolean;
		}

		namespace Namespace {
			type ALL = Result<Namespace[]>;
			type CREATE = Result<Namespace>;
			type RENAME = Response;
			type DELETE = Response;
		}

		interface Key {
			name: string;
			expiration: Nullable<number>;
			metadata: Record<string, string>;
		}

		namespace Key {
			type ALL = Result<Key[]>;
			type FIND = string;
			type CREATE = Response
			type DELETE = Response;
		}
	}
}
