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

		interface Script {
			etag: string;
			size: number;
			modified_on: string;
			script: string;
		}

		namespace Script {
			type ALL = Result<(Omit<Script, 'script'> & { id: string; created_on: string })[]>;
			type UPLOAD = Result<Script>;
			type DOWNLOAD = Script['script'];
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
