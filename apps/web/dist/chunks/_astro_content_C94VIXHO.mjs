import { o as objectType, i as dateType, j as arrayType, s as stringType, A as AstroError, U as UnknownContentCollectionError, c as createComponent, R as RenderUndefinedEntryError, u as unescapeHTML, r as renderTemplate, k as escape, l as renderUniqueStylesheet, n as renderScriptElement, p as createHeadAndContent, a as renderComponent } from './astro/server_BN1mmHq8.mjs';

var e=e=>Object.prototype.toString.call(e),t=e=>ArrayBuffer.isView(e)&&!(e instanceof DataView),o=t=>"[object Date]"===e(t),n=t=>"[object RegExp]"===e(t),r=t=>"[object Error]"===e(t),s=t=>"[object Boolean]"===e(t),l=t=>"[object Number]"===e(t),i=t=>"[object String]"===e(t),c=Array.isArray,u=Object.getOwnPropertyDescriptor,a=Object.prototype.propertyIsEnumerable,f=Object.getOwnPropertySymbols,p=Object.prototype.hasOwnProperty,h=Object.keys;function d(e){const t=h(e),o=f(e);for(let n=0;n<o.length;n++)a.call(e,o[n])&&t.push(o[n]);return t}function b(e,t){return !u(e,t)?.writable}function y(e,u){if("object"==typeof e&&null!==e){let a;if(c(e))a=[];else if(o(e))a=new Date(e.getTime?e.getTime():e);else if(n(e))a=new RegExp(e);else if(r(e))a={message:e.message};else if(s(e)||l(e)||i(e))a=Object(e);else {if(t(e))return e.slice();a=Object.create(Object.getPrototypeOf(e));}const f=u.includeSymbols?d:h;for(const t of f(e))a[t]=e[t];return a}return e}var g={includeSymbols:false,immutable:false};function m(e,t,o=g){const n=[],r=[];let s=true;const l=o.includeSymbols?d:h,i=!!o.immutable;return function e(u){const a=i?y(u,o):u,f={};let h=true;const d={node:a,node_:u,path:[].concat(n),parent:r[r.length-1],parents:r,key:n[n.length-1],isRoot:0===n.length,level:n.length,circular:void 0,isLeaf:false,notLeaf:true,notRoot:true,isFirst:false,isLast:false,update:function(e,t=false){d.isRoot||(d.parent.node[d.key]=e),d.node=e,t&&(h=false);},delete:function(e){delete d.parent.node[d.key],e&&(h=false);},remove:function(e){c(d.parent.node)?d.parent.node.splice(d.key,1):delete d.parent.node[d.key],e&&(h=false);},keys:null,before:function(e){f.before=e;},after:function(e){f.after=e;},pre:function(e){f.pre=e;},post:function(e){f.post=e;},stop:function(){s=false;},block:function(){h=false;}};if(!s)return d;function g(){if("object"==typeof d.node&&null!==d.node){d.keys&&d.node_===d.node||(d.keys=l(d.node)),d.isLeaf=0===d.keys.length;for(let e=0;e<r.length;e++)if(r[e].node_===u){d.circular=r[e];break}}else d.isLeaf=true,d.keys=null;d.notLeaf=!d.isLeaf,d.notRoot=!d.isRoot;}g();const m=t(d,d.node);if(void 0!==m&&d.update&&d.update(m),f.before&&f.before(d,d.node),!h)return d;if("object"==typeof d.node&&null!==d.node&&!d.circular){r.push(d),g();for(const[t,o]of Object.entries(d.keys??[])){n.push(o),f.pre&&f.pre(d,d.node[o],o);const r=e(d.node[o]);i&&p.call(d.node,o)&&!b(d.node,o)&&(d.node[o]=r.node),r.isLast=!!d.keys?.length&&+t==d.keys.length-1,r.isFirst=0==+t,f.post&&f.post(d,r),n.pop();}r.pop();}return f.after&&f.after(d,d.node),d}(e).node}var j=class{#e;#t;constructor(e,t=g){this.#e=e,this.#t=t;}get(e){let t=this.#e;for(let o=0;t&&o<e.length;o++){const n=e[o];if(!p.call(t,n)||!this.#t.includeSymbols&&"symbol"==typeof n)return;t=t[n];}return t}has(e){let t=this.#e;for(let o=0;t&&o<e.length;o++){const n=e[o];if(!p.call(t,n)||!this.#t.includeSymbols&&"symbol"==typeof n)return  false;t=t[n];}return  true}set(e,t){let o=this.#e,n=0;for(n=0;n<e.length-1;n++){const t=e[n];p.call(o,t)||(o[t]={}),o=o[t];}return o[e[n]]=t,t}map(e){return m(this.#e,e,{immutable:true,includeSymbols:!!this.#t.includeSymbols})}forEach(e){return this.#e=m(this.#e,e,this.#t),this.#e}reduce(e,t){const o=1===arguments.length;let n=o?this.#e:t;return this.forEach(((t,r)=>{t.isRoot&&o||(n=e(t,n,r));})),n}paths(){const e=[];return this.forEach((t=>{e.push(t.path);})),e}nodes(){const e=[];return this.forEach((t=>{e.push(t.node);})),e}clone(){const e=[],o=[],n=this.#t;return t(this.#e)?this.#e.slice():function t(r){for(let t=0;t<e.length;t++)if(e[t]===r)return o[t];if("object"==typeof r&&null!==r){const s=y(r,n);e.push(r),o.push(s);const l=n.includeSymbols?d:h;for(const e of l(r))s[e]=t(r[e]);return e.pop(),o.pop(),s}return r}(this.#e)}};

/*
How it works:
`this.#head` is an instance of `Node` which keeps track of its current value and nests another instance of `Node` that keeps the value that comes after it. When a value is provided to `.enqueue()`, the code needs to iterate through `this.#head`, going deeper and deeper to find the last value. However, iterating through every single item is slow. This problem is solved by saving a reference to the last value as `this.#tail` so that it can reference it to add a new value.
*/

class Node {
	value;
	next;

	constructor(value) {
		this.value = value;
	}
}

class Queue {
	#head;
	#tail;
	#size;

	constructor() {
		this.clear();
	}

	enqueue(value) {
		const node = new Node(value);

		if (this.#head) {
			this.#tail.next = node;
			this.#tail = node;
		} else {
			this.#head = node;
			this.#tail = node;
		}

		this.#size++;
	}

	dequeue() {
		const current = this.#head;
		if (!current) {
			return;
		}

		this.#head = this.#head.next;
		this.#size--;

		// Clean up tail reference when queue becomes empty
		if (!this.#head) {
			this.#tail = undefined;
		}

		return current.value;
	}

	peek() {
		if (!this.#head) {
			return;
		}

		return this.#head.value;

		// TODO: Node.js 18.
		// return this.#head?.value;
	}

	clear() {
		this.#head = undefined;
		this.#tail = undefined;
		this.#size = 0;
	}

	get size() {
		return this.#size;
	}

	* [Symbol.iterator]() {
		let current = this.#head;

		while (current) {
			yield current.value;
			current = current.next;
		}
	}

	* drain() {
		while (this.#head) {
			yield this.dequeue();
		}
	}
}

function pLimit(concurrency) {
	validateConcurrency(concurrency);

	const queue = new Queue();
	let activeCount = 0;

	const resumeNext = () => {
		if (activeCount < concurrency && queue.size > 0) {
			queue.dequeue()();
			// Since `pendingCount` has been decreased by one, increase `activeCount` by one.
			activeCount++;
		}
	};

	const next = () => {
		activeCount--;

		resumeNext();
	};

	const run = async (function_, resolve, arguments_) => {
		const result = (async () => function_(...arguments_))();

		resolve(result);

		try {
			await result;
		} catch {}

		next();
	};

	const enqueue = (function_, resolve, arguments_) => {
		// Queue `internalResolve` instead of the `run` function
		// to preserve asynchronous context.
		new Promise(internalResolve => {
			queue.enqueue(internalResolve);
		}).then(
			run.bind(undefined, function_, resolve, arguments_),
		);

		(async () => {
			// This function needs to wait until the next microtask before comparing
			// `activeCount` to `concurrency`, because `activeCount` is updated asynchronously
			// after the `internalResolve` function is dequeued and called. The comparison in the if-statement
			// needs to happen asynchronously as well to get an up-to-date value for `activeCount`.
			await Promise.resolve();

			if (activeCount < concurrency) {
				resumeNext();
			}
		})();
	};

	const generator = (function_, ...arguments_) => new Promise(resolve => {
		enqueue(function_, resolve, arguments_);
	});

	Object.defineProperties(generator, {
		activeCount: {
			get: () => activeCount,
		},
		pendingCount: {
			get: () => queue.size,
		},
		clearQueue: {
			value() {
				queue.clear();
			},
		},
		concurrency: {
			get: () => concurrency,

			set(newConcurrency) {
				validateConcurrency(newConcurrency);
				concurrency = newConcurrency;

				queueMicrotask(() => {
					// eslint-disable-next-line no-unmodified-loop-condition
					while (activeCount < concurrency && queue.size > 0) {
						resumeNext();
					}
				});
			},
		},
	});

	return generator;
}

function validateConcurrency(concurrency) {
	if (!((Number.isInteger(concurrency) || concurrency === Number.POSITIVE_INFINITY) && concurrency > 0)) {
		throw new TypeError('Expected `concurrency` to be a number from 1 and up');
	}
}

function prependForwardSlash(path) {
  return path[0] === "/" ? path : "/" + path;
}
function removeTrailingForwardSlash(path) {
  return path.endsWith("/") ? path.slice(0, path.length - 1) : path;
}
function removeLeadingForwardSlash(path) {
  return path.startsWith("/") ? path.substring(1) : path;
}
function trimSlashes(path) {
  return path.replace(/^\/|\/$/g, "");
}
function isString(path) {
  return typeof path === "string" || path instanceof String;
}
function joinPaths(...paths) {
  return paths.filter(isString).map((path, i) => {
    if (i === 0) {
      return removeTrailingForwardSlash(path);
    } else if (i === paths.length - 1) {
      return removeLeadingForwardSlash(path);
    } else {
      return trimSlashes(path);
    }
  }).join("/");
}
function isRemotePath(src) {
  if (!src) return false;
  const trimmed = src.trim();
  if (!trimmed) return false;
  let decoded = trimmed;
  let previousDecoded = "";
  let maxIterations = 10;
  while (decoded !== previousDecoded && maxIterations > 0) {
    previousDecoded = decoded;
    try {
      decoded = decodeURIComponent(decoded);
    } catch {
      break;
    }
    maxIterations--;
  }
  if (/^[a-zA-Z]:/.test(decoded)) {
    return false;
  }
  if (decoded[0] === "/" && decoded[1] !== "/" && decoded[1] !== "\\") {
    return false;
  }
  if (decoded[0] === "\\") {
    return true;
  }
  if (decoded.startsWith("//")) {
    return true;
  }
  try {
    const url = new URL(decoded, "http://n");
    if (url.username || url.password) {
      return true;
    }
    if (decoded.includes("@") && !url.pathname.includes("@") && !url.search.includes("@")) {
      return true;
    }
    if (url.origin !== "http://n") {
      const protocol = url.protocol.toLowerCase();
      if (protocol === "file:") {
        return false;
      }
      return true;
    }
    if (URL.canParse(decoded)) {
      return true;
    }
    return false;
  } catch {
    return true;
  }
}
function removeBase(path, base) {
  if (path.startsWith(base)) {
    return path.slice(removeTrailingForwardSlash(base).length);
  }
  return path;
}

const CONTENT_IMAGE_FLAG = "astroContentImageFlag";
const IMAGE_IMPORT_PREFIX = "__ASTRO_IMAGE_";

const VALID_INPUT_FORMATS = [
  "jpeg",
  "jpg",
  "png",
  "tiff",
  "webp",
  "gif",
  "svg",
  "avif"
];
const VALID_SUPPORTED_FORMATS = [
  "jpeg",
  "jpg",
  "png",
  "tiff",
  "webp",
  "gif",
  "svg",
  "avif"
];
const DEFAULT_OUTPUT_FORMAT = "webp";
const DEFAULT_HASH_PROPS = [
  "src",
  "width",
  "height",
  "format",
  "quality",
  "fit",
  "position",
  "background"
];

function imageSrcToImportId(imageSrc, filePath) {
  imageSrc = removeBase(imageSrc, IMAGE_IMPORT_PREFIX);
  if (isRemotePath(imageSrc)) {
    return;
  }
  const ext = imageSrc.split(".").at(-1)?.toLowerCase();
  if (!ext || !VALID_INPUT_FORMATS.includes(ext)) {
    return;
  }
  const params = new URLSearchParams(CONTENT_IMAGE_FLAG);
  if (filePath) {
    params.set("importer", filePath);
  }
  return `${imageSrc}?${params.toString()}`;
}

const UNDEFINED = -1;
const HOLE = -2;
const NAN = -3;
const POSITIVE_INFINITY = -4;
const NEGATIVE_INFINITY = -5;
const NEGATIVE_ZERO = -6;
const SPARSE = -7;

// The largest valid value for a JavaScript array's `length` property,
// and the largest valid array index (one less than the max length).
const MAX_ARRAY_LEN = 2 ** 32 - 1;
const MAX_ARRAY_INDEX = MAX_ARRAY_LEN - 1;

/** @param {number} n */
function is_valid_array_index(n) {
	if (!Number.isInteger(n)) return false;
	if (n < 0) return false;
	if (n > MAX_ARRAY_INDEX) return false;
	return true;
}

/** @param {number} n */
function is_valid_array_len(n) {
	if (!Number.isInteger(n)) return false;
	if (n < 0) return false;
	if (n > MAX_ARRAY_LEN) return false;
	return true;
}

/* Baseline 2025 runtimes */


/**	@type {(base64: string) => ArrayBuffer} */
function decode_native(base64) {
	return Uint8Array.fromBase64(base64).buffer;
}

/**	@type {(base64: string) => ArrayBuffer} */
function decode_buffer(base64) {
	return Uint8Array.from(Buffer.from(base64, 'base64')).buffer;
}

/**	@type {(base64: string) => ArrayBuffer} */
function decode_legacy(base64) {
	const binary_string = atob(base64);
	const len = binary_string.length;
	const array = new Uint8Array(len);

	for (let i = 0; i < len; i++) {
		array[i] = binary_string.charCodeAt(i);
	}

	return array.buffer;
}

const native = typeof Uint8Array.fromBase64 === 'function';
const buffer = typeof process === 'object' && process.versions?.node !== undefined;
const decode64 = native ? decode_native : buffer ? decode_buffer : decode_legacy;

/**
 * Merges caller-provided operation overrides over the defaults. Iterating the
 * default keys (rather than the override's own keys) means nullish members
 * fall back to the default, and inherited members — e.g. from a class
 * instance — are picked up.
 *
 * @template {Record<string, any>} T
 * @param {T} defaults
 * @param {Partial<T> | undefined} overrides
 * @returns {T}
 */
function merge_operations(defaults, overrides) {
	return defaults;
}

/**
 * The default implementations of every construction operation `parse` and
 * `unflatten` perform while reviving a value. Each one uses native
 * JavaScript semantics (built-in constructors, property assignment, etc).
 *
 * Pass overrides via the `operations` option of `parse`/`unflatten` to
 * customize how values are built — e.g. to construct them from the
 * intrinsics of a different realm (a `node:vm` context), or to build up
 * values inside another JavaScript runtime (a WASM-hosted engine, a remote
 * process) through handle objects.
 *
 * The object is frozen — it is shared by every `parse` call that does not
 * override a given operation.
 *
 */
/** @type {import('./types.js').DefaultParseOperations} */
const parse_operations = {
	fromPrimitive: (primitive) => primitive,

	fromISOString: (iso) => new Date(iso),

	fromStringValue: (tag, text) => {
		if (tag === 'URL') return new URL(text);
		if (tag === 'URLSearchParams') return new URLSearchParams(text);
		// 'Temporal.Instant', 'Temporal.PlainDate', ...
		// @ts-expect-error TS doesn't know about Temporal yet
		return Temporal[tag.slice(9)].from(text);
	},

	fromArrayBuffer: (buffer) => buffer,

	fromRegExpInfo: (source, flags) => new RegExp(source, flags),

	fromViewInfo: (tag, buffer, byteOffset, length) => {
		const Constructor = /** @type {any} */ (globalThis)[tag];
		return byteOffset !== undefined
			? new Constructor(buffer, byteOffset, length)
			: new Constructor(buffer);
	},

	box: (value) => Object(value),

	createArray: (length) => new Array(length),

	createSparseArray: (length) => {
		/** @type {any[]} */
		const array = [];

		// Setting `array.length = length` (or equivalently calling
		// `new Array(length)`) on an untrusted length is a DoS vector: V8
		// eagerly allocates a contiguous backing store for array lengths below
		// ~10^8, so a small payload with a huge declared length can force
		// arbitrary memory allocation. Touching the largest-possible index
		// first forces V8 into dictionary-elements mode, where `length` is
		// just a number and no contiguous allocation occurs.
		array[MAX_ARRAY_INDEX] = undefined;
		delete array[MAX_ARRAY_INDEX];
		array.length = length;

		return array;
	},

	createObject: () => ({}),

	createNullPrototypeObject: () => Object.create(null),

	createSet: () => new Set(),

	createMap: () => new Map(),

	set: (target, key, value) => {
		target[key] = value;
	},

	addValue: (set, value) => {
		set.add(value);
	},

	addEntry: (map, key, value) => {
		map.set(key, value);
	}
};

const default_parse_operations = Object.freeze(parse_operations);

/**
 * Revive a value flattened with `devalue.stringify`
 * @param {number | any[]} parsed
 * @param {Record<string, (value: any) => any>} [revivers]
 * @param {import('./types.js').ParseOptions} [options]
 */
function unflatten(parsed, revivers, options) {
	/** @type {import('./types.js').ParseOperations} */
	const ops = merge_operations(default_parse_operations);

	if (typeof parsed === 'number') return hydrate(parsed, true);

	if (!Array.isArray(parsed) || parsed.length === 0) {
		throw new Error('Invalid input');
	}

	const values = /** @type {any[]} */ (parsed);

	const hydrated = Array(values.length);

	/**
	 * @param {number} index
	 * @returns {any}
	 */
	function hydrate(index, standalone = false) {
		if (index === UNDEFINED) return ops.fromPrimitive(undefined);
		if (index === NAN) return ops.fromPrimitive(NaN);
		if (index === POSITIVE_INFINITY) return ops.fromPrimitive(Infinity);
		if (index === NEGATIVE_INFINITY) return ops.fromPrimitive(-Infinity);
		if (index === NEGATIVE_ZERO) return ops.fromPrimitive(-0);

		if (standalone || typeof index !== 'number') {
			throw new Error(`Invalid input`);
		}

		if (index in hydrated) return hydrated[index];

		const value = values[index];

		if (!value || typeof value !== 'object') {
			hydrated[index] = ops.fromPrimitive(value);
		} else if (Array.isArray(value)) {
			if (typeof value[0] === 'string') {
				const type = value[0];

				switch (type) {
					case 'Date':
						hydrated[index] = ops.fromISOString(value[1]);
						break;

					case 'Set':
						const set = ops.createSet();
						hydrated[index] = set;
						for (let i = 1; i < value.length; i += 1) {
							ops.addValue(set, hydrate(value[i]));
						}
						break;

					case 'Map':
						const map = ops.createMap();
						hydrated[index] = map;
						for (let i = 1; i < value.length; i += 2) {
							ops.addEntry(map, hydrate(value[i]), hydrate(value[i + 1]));
						}
						break;

					case 'RegExp':
						hydrated[index] = ops.fromRegExpInfo(value[1], value[2]);
						break;

					case 'Object': {
						const wrapped_index = value[1];

						if (
							typeof values[wrapped_index] === 'object' &&
							values[wrapped_index][0] !== 'BigInt'
						) {
							// avoid infinite recusion in case of malformed input
							throw new Error('Invalid input');
						}

						hydrated[index] = ops.box(hydrate(wrapped_index));
						break;
					}

					case 'BigInt':
						hydrated[index] = ops.fromPrimitive(BigInt(value[1]));
						break;

					case 'null':
						const obj = ops.createNullPrototypeObject();
						hydrated[index] = obj;
						for (let i = 1; i < value.length; i += 2) {
							if (value[i] === '__proto__') {
								throw new Error('Cannot parse an object with a `__proto__` property');
							}

							ops.set(obj, value[i], hydrate(value[i + 1]));
						}
						break;

					case 'Int8Array':
					case 'Uint8Array':
					case 'Uint8ClampedArray':
					case 'Int16Array':
					case 'Uint16Array':
					case 'Float16Array':
					case 'Int32Array':
					case 'Uint32Array':
					case 'Float32Array':
					case 'Float64Array':
					case 'BigInt64Array':
					case 'BigUint64Array':
					case 'DataView': {
						if (values[value[1]][0] !== 'ArrayBuffer') {
							// without this, if we receive malformed input we could
							// end up trying to hydrate in a circle or allocate
							// huge amounts of memory when we call `new TypedArrayConstructor(buffer)`
							throw new Error('Invalid data');
						}

						const buffer = hydrate(value[1]);

						hydrated[index] = ops.fromViewInfo(type, buffer, value[2], value[3]);

						break;
					}

					case 'ArrayBuffer': {
						const base64 = value[1];
						if (typeof base64 !== 'string') {
							throw new Error('Invalid ArrayBuffer encoding');
						}
						hydrated[index] = ops.fromArrayBuffer(decode64(base64));
						break;
					}

					case 'URL':
					case 'URLSearchParams':
					case 'Temporal.Duration':
					case 'Temporal.Instant':
					case 'Temporal.PlainDate':
					case 'Temporal.PlainTime':
					case 'Temporal.PlainDateTime':
					case 'Temporal.PlainMonthDay':
					case 'Temporal.PlainYearMonth':
					case 'Temporal.ZonedDateTime': {
						// the same tags `toStringValue` serializes on the stringify side
						hydrated[index] = ops.fromStringValue(type, value[1]);
						break;
					}

					default:
						throw new Error(`Unknown type ${type}`);
				}
			} else if (value[0] === SPARSE) {
				// Sparse array encoding: [SPARSE, length, idx, val, idx, val, ...]
				const len = value[1];

				if (!is_valid_array_len(len)) {
					throw new Error('Invalid input');
				}

				// `len` comes from the input rather than being bounded by it, so
				// `createSparseArray` is responsible for not allocating storage
				// proportional to it.
				const array = ops.createSparseArray(len);
				hydrated[index] = array;

				for (let i = 2; i < value.length; i += 2) {
					const idx = value[i];

					if (!is_valid_array_index(idx) || idx >= len) {
						throw new Error('Invalid input');
					}

					ops.set(array, idx, hydrate(value[i + 1]));
				}
			} else {
				const array = ops.createArray(value.length);
				hydrated[index] = array;

				for (let i = 0; i < value.length; i += 1) {
					const n = value[i];
					if (n === HOLE) continue;

					ops.set(array, i, hydrate(n));
				}
			}
		} else {
			const object = ops.createObject();
			hydrated[index] = object;

			for (const key of Object.keys(value)) {
				if (key === '__proto__') {
					throw new Error('Cannot parse an object with a `__proto__` property');
				}

				ops.set(object, key, hydrate(value[key]));
			}
		}

		return hydrated[index];
	}

	return hydrate(0);
}

class ImmutableDataStore {
  _collections = /* @__PURE__ */ new Map();
  constructor() {
    this._collections = /* @__PURE__ */ new Map();
  }
  get(collectionName, key) {
    return this._collections.get(collectionName)?.get(String(key));
  }
  entries(collectionName) {
    const collection = this._collections.get(collectionName) ?? /* @__PURE__ */ new Map();
    return [...collection.entries()];
  }
  values(collectionName) {
    const collection = this._collections.get(collectionName) ?? /* @__PURE__ */ new Map();
    return [...collection.values()];
  }
  keys(collectionName) {
    const collection = this._collections.get(collectionName) ?? /* @__PURE__ */ new Map();
    return [...collection.keys()];
  }
  has(collectionName, key) {
    const collection = this._collections.get(collectionName);
    if (collection) {
      return collection.has(String(key));
    }
    return false;
  }
  hasCollection(collectionName) {
    return this._collections.has(collectionName);
  }
  collections() {
    return this._collections;
  }
  /**
   * Attempts to load a DataStore from the virtual module.
   * This only works in Vite.
   */
  static async fromModule() {
    try {
      const data = await import('./_astro_data-layer-content_wwRqmm33.mjs');
      if (data.default instanceof Map) {
        return ImmutableDataStore.fromMap(data.default);
      }
      const map = unflatten(data.default);
      return ImmutableDataStore.fromMap(map);
    } catch {
    }
    return new ImmutableDataStore();
  }
  static async fromMap(data) {
    const store = new ImmutableDataStore();
    store._collections = data;
    return store;
  }
}
function dataStoreSingleton() {
  let instance = void 0;
  return {
    get: async () => {
      if (!instance) {
        instance = ImmutableDataStore.fromModule();
      }
      return instance;
    },
    set: (store) => {
      instance = store;
    }
  };
}
const globalDataStore = dataStoreSingleton();

const __vite_import_meta_env__ = {"ASSETS_PREFIX": undefined, "BASE_URL": "/", "DEV": false, "MODE": "production", "PROD": true, "PUBLIC_GTM_ID": "GTM-KB54PFTP", "PUBLIC_SUPABASE_ANON_KEY": "sb_publishable_Angs7lNzy-IyzRuRjIswuQ_3pijDrOQ", "PUBLIC_SUPABASE_URL": "https://eileoaxbxiimmrcakhcy.supabase.co", "SITE": "https://atrari-pro.github.io/studio-jannah", "SSR": true};
function createCollectionToGlobResultMap({
  globResult,
  contentDir
}) {
  const collectionToGlobResultMap = {};
  for (const key in globResult) {
    const keyRelativeToContentDir = key.replace(new RegExp(`^${contentDir}`), "");
    const segments = keyRelativeToContentDir.split("/");
    if (segments.length <= 1) continue;
    const collection = segments[0];
    collectionToGlobResultMap[collection] ??= {};
    collectionToGlobResultMap[collection][key] = globResult[key];
  }
  return collectionToGlobResultMap;
}
objectType({
  tags: arrayType(stringType()).optional(),
  lastModified: dateType().optional()
});
function createGetCollection({
  contentCollectionToEntryMap,
  dataCollectionToEntryMap,
  getRenderEntryImport,
  cacheEntriesByCollection,
  liveCollections
}) {
  return async function getCollection(collection, filter) {
    if (collection in liveCollections) {
      throw new AstroError({
        ...UnknownContentCollectionError,
        message: `Collection "${collection}" is a live collection. Use getLiveCollection() instead of getCollection().`
      });
    }
    const hasFilter = typeof filter === "function";
    const store = await globalDataStore.get();
    let type;
    if (collection in contentCollectionToEntryMap) {
      type = "content";
    } else if (collection in dataCollectionToEntryMap) {
      type = "data";
    } else if (store.hasCollection(collection)) {
      const { default: imageAssetMap } = await import('./content-assets_DleWbedO.mjs');
      const result = [];
      for (const rawEntry of store.values(collection)) {
        const data = updateImageReferencesInData(rawEntry.data, rawEntry.filePath, imageAssetMap);
        let entry = {
          ...rawEntry,
          data,
          collection
        };
        if (entry.legacyId) {
          entry = emulateLegacyEntry(entry);
        }
        if (hasFilter && !filter(entry)) {
          continue;
        }
        result.push(entry);
      }
      return result;
    } else {
      console.warn(
        `The collection ${JSON.stringify(
          collection
        )} does not exist or is empty. Please check your content config file for errors.`
      );
      return [];
    }
    const lazyImports = Object.values(
      type === "content" ? contentCollectionToEntryMap[collection] : dataCollectionToEntryMap[collection]
    );
    let entries = [];
    if (!Object.assign(__vite_import_meta_env__, {})?.DEV && cacheEntriesByCollection.has(collection)) {
      entries = cacheEntriesByCollection.get(collection);
    } else {
      const limit = pLimit(10);
      entries = await Promise.all(
        lazyImports.map(
          (lazyImport) => limit(async () => {
            const entry = await lazyImport();
            return type === "content" ? {
              id: entry.id,
              slug: entry.slug,
              body: entry.body,
              collection: entry.collection,
              data: entry.data,
              async render() {
                return render({
                  collection: entry.collection,
                  id: entry.id,
                  renderEntryImport: await getRenderEntryImport(collection, entry.slug)
                });
              }
            } : {
              id: entry.id,
              collection: entry.collection,
              data: entry.data
            };
          })
        )
      );
      cacheEntriesByCollection.set(collection, entries);
    }
    if (hasFilter) {
      return entries.filter(filter);
    } else {
      return entries.slice();
    }
  };
}
function emulateLegacyEntry({ legacyId, ...entry }) {
  const legacyEntry = {
    ...entry,
    id: legacyId,
    slug: entry.id
  };
  return {
    ...legacyEntry,
    // Define separately so the render function isn't included in the object passed to `renderEntry()`
    render: () => renderEntry(legacyEntry)
  };
}
const CONTENT_LAYER_IMAGE_REGEX = /__ASTRO_IMAGE_="([^"]+)"/g;
async function updateImageReferencesInBody(html, fileName) {
  const { default: imageAssetMap } = await import('./content-assets_DleWbedO.mjs');
  const imageObjects = /* @__PURE__ */ new Map();
  const { getImage } = await import('./_astro_assets_DXTyvCy_.mjs').then(n => n._);
  for (const [_full, imagePath] of html.matchAll(CONTENT_LAYER_IMAGE_REGEX)) {
    try {
      const decodedImagePath = JSON.parse(imagePath.replaceAll("&#x22;", '"'));
      let image;
      if (URL.canParse(decodedImagePath.src)) {
        image = await getImage(decodedImagePath);
      } else {
        const id = imageSrcToImportId(decodedImagePath.src, fileName);
        const imported = imageAssetMap.get(id);
        if (!id || imageObjects.has(id) || !imported) {
          continue;
        }
        image = await getImage({ ...decodedImagePath, src: imported });
      }
      imageObjects.set(imagePath, image);
    } catch {
      throw new Error(`Failed to parse image reference: ${imagePath}`);
    }
  }
  return html.replaceAll(CONTENT_LAYER_IMAGE_REGEX, (full, imagePath) => {
    const image = imageObjects.get(imagePath);
    if (!image) {
      return full;
    }
    const { index, ...attributes } = image.attributes;
    return Object.entries({
      ...attributes,
      src: image.src,
      srcset: image.srcSet.attribute,
      // This attribute is used by the toolbar audit
      ...Object.assign(__vite_import_meta_env__, {}).DEV ? { "data-image-component": "true" } : {}
    }).map(([key, value]) => value ? `${key}="${escape(value)}"` : "").join(" ");
  });
}
function updateImageReferencesInData(data, fileName, imageAssetMap) {
  return new j(data).map(function(ctx, val) {
    if (typeof val === "string" && val.startsWith(IMAGE_IMPORT_PREFIX)) {
      const src = val.replace(IMAGE_IMPORT_PREFIX, "");
      const id = imageSrcToImportId(src, fileName);
      if (!id) {
        ctx.update(src);
        return;
      }
      const imported = imageAssetMap?.get(id);
      if (imported) {
        ctx.update(imported);
      } else {
        ctx.update(src);
      }
    }
  });
}
async function renderEntry(entry) {
  if (!entry) {
    throw new AstroError(RenderUndefinedEntryError);
  }
  if ("render" in entry && !("legacyId" in entry)) {
    return entry.render();
  }
  if (entry.deferredRender) {
    try {
      const { default: contentModules } = await import('./content-modules_Dz-S_Wwv.mjs');
      const renderEntryImport = contentModules.get(entry.filePath);
      return render({
        collection: "",
        id: entry.id,
        renderEntryImport
      });
    } catch (e) {
      console.error(e);
    }
  }
  const html = entry?.rendered?.metadata?.imagePaths?.length && entry.filePath ? await updateImageReferencesInBody(entry.rendered.html, entry.filePath) : entry?.rendered?.html;
  const Content = createComponent(() => renderTemplate`${unescapeHTML(html)}`);
  return {
    Content,
    headings: entry?.rendered?.metadata?.headings ?? [],
    remarkPluginFrontmatter: entry?.rendered?.metadata?.frontmatter ?? {}
  };
}
async function render({
  collection,
  id,
  renderEntryImport
}) {
  const UnexpectedRenderError = new AstroError({
    ...UnknownContentCollectionError,
    message: `Unexpected error while rendering ${String(collection)} → ${String(id)}.`
  });
  if (typeof renderEntryImport !== "function") throw UnexpectedRenderError;
  const baseMod = await renderEntryImport();
  if (baseMod == null || typeof baseMod !== "object") throw UnexpectedRenderError;
  const { default: defaultMod } = baseMod;
  if (isPropagatedAssetsModule(defaultMod)) {
    const { collectedStyles, collectedLinks, collectedScripts, getMod } = defaultMod;
    if (typeof getMod !== "function") throw UnexpectedRenderError;
    const propagationMod = await getMod();
    if (propagationMod == null || typeof propagationMod !== "object") throw UnexpectedRenderError;
    const Content = createComponent({
      factory(result, baseProps, slots) {
        let styles = "", links = "", scripts = "";
        if (Array.isArray(collectedStyles)) {
          styles = collectedStyles.map((style) => {
            return renderUniqueStylesheet(result, {
              type: "inline",
              content: style
            });
          }).join("");
        }
        if (Array.isArray(collectedLinks)) {
          links = collectedLinks.map((link) => {
            return renderUniqueStylesheet(result, {
              type: "external",
              src: isRemotePath(link) ? link : prependForwardSlash(link)
            });
          }).join("");
        }
        if (Array.isArray(collectedScripts)) {
          scripts = collectedScripts.map((script) => renderScriptElement(script)).join("");
        }
        let props = baseProps;
        if (id.endsWith("mdx")) {
          props = {
            components: propagationMod.components ?? {},
            ...baseProps
          };
        }
        return createHeadAndContent(
          unescapeHTML(styles + links + scripts),
          renderTemplate`${renderComponent(
            result,
            "Content",
            propagationMod.Content,
            props,
            slots
          )}`
        );
      },
      propagation: "self"
    });
    return {
      Content,
      headings: propagationMod.getHeadings?.() ?? [],
      remarkPluginFrontmatter: propagationMod.frontmatter ?? {}
    };
  } else if (baseMod.Content && typeof baseMod.Content === "function") {
    return {
      Content: baseMod.Content,
      headings: baseMod.getHeadings?.() ?? [],
      remarkPluginFrontmatter: baseMod.frontmatter ?? {}
    };
  } else {
    throw UnexpectedRenderError;
  }
}
function isPropagatedAssetsModule(module) {
  return typeof module === "object" && module != null && "__astroPropagation" in module;
}

// astro-head-inject

const liveCollections = {};

const contentDir = '/src/content/';

const contentEntryGlob = "";
const contentCollectionToEntryMap = createCollectionToGlobResultMap({
	globResult: contentEntryGlob,
	contentDir,
});

const dataEntryGlob = "";
const dataCollectionToEntryMap = createCollectionToGlobResultMap({
	globResult: dataEntryGlob,
	contentDir,
});
createCollectionToGlobResultMap({
	globResult: { ...contentEntryGlob, ...dataEntryGlob },
	contentDir,
});

let lookupMap = {};
lookupMap = {};

new Set(Object.keys(lookupMap));

function createGlobLookup(glob) {
	return async (collection, lookupId) => {
		const filePath = lookupMap[collection]?.entries[lookupId];

		if (!filePath) return undefined;
		return glob[collection][filePath];
	};
}

const renderEntryGlob = "";
const collectionToRenderEntryMap = createCollectionToGlobResultMap({
	globResult: renderEntryGlob,
	contentDir,
});

const cacheEntriesByCollection = new Map();
const getCollection = createGetCollection({
	contentCollectionToEntryMap,
	dataCollectionToEntryMap,
	getRenderEntryImport: createGlobLookup(collectionToRenderEntryMap),
	cacheEntriesByCollection,
	liveCollections,
});

export { DEFAULT_OUTPUT_FORMAT as D, VALID_SUPPORTED_FORMATS as V, DEFAULT_HASH_PROPS as a, getCollection as g, isRemotePath as i, joinPaths as j, renderEntry as r };
