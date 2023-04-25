"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var src_exports = {};
__export(src_exports, {
  Pointer: () => Pointer,
  applyPatch: () => applyPatch,
  createPatch: () => createPatch,
  createTests: () => createTests
});
module.exports = __toCommonJS(src_exports);

// src/pointer.ts
function unescape(token) {
  return token.replace(/~1/g, "/").replace(/~0/g, "~");
}
function escape(token) {
  return token.replace(/~/g, "~0").replace(/\//g, "~1");
}
var Pointer = class {
  constructor(tokens = [""]) {
    this.tokens = tokens;
  }
  /**
  `path` *must* be a properly escaped string.
  */
  static fromJSON(path) {
    const tokens = path.split("/").map(unescape);
    if (tokens[0] !== "")
      throw new Error(`Invalid JSON Pointer: ${path}`);
    return new Pointer(tokens);
  }
  toString() {
    return this.tokens.map(escape).join("/");
  }
  /**
  Returns an object with 'parent', 'key', and 'value' properties.
  In the special case that this Pointer's path == "",
  this object will be {parent: null, key: '', value: object}.
  Otherwise, parent and key will have the property such that parent[key] == value.
  */
  evaluate(object) {
    let parent = null;
    let key = "";
    let value = object;
    for (let i = 1, l = this.tokens.length; i < l; i++) {
      parent = value;
      key = this.tokens[i];
      if (key == "__proto__" || key == "constructor" || key == "prototype") {
        continue;
      }
      value = (parent || {})[key];
    }
    return { parent, key, value };
  }
  get(object) {
    return this.evaluate(object).value;
  }
  set(object, value) {
    let cursor = object;
    for (let i = 1, l = this.tokens.length - 1, token = this.tokens[i]; i < l; i++) {
      cursor = (cursor || {})[token];
    }
    if (cursor) {
      cursor[this.tokens[this.tokens.length - 1]] = value;
    }
  }
  push(token) {
    this.tokens.push(token);
  }
  /**
    `token` should be a String. It'll be coerced to one anyway.
  
    immutable (shallowly)
    */
  add(token) {
    const tokens = this.tokens.concat(String(token));
    return new Pointer(tokens);
  }
};

// src/util.ts
var hasOwnProperty = Object.prototype.hasOwnProperty;
function objectType(object) {
  if (object === void 0) {
    return "undefined";
  }
  if (object === null) {
    return "null";
  }
  if (Array.isArray(object)) {
    return "array";
  }
  return typeof object;
}
function isNonPrimitive(value) {
  return value != null && typeof value == "object";
}
function clone(source) {
  if (!isNonPrimitive(source)) {
    return source;
  }
  if (source.constructor == Array) {
    const length = source.length;
    const arrayTarget = new Array(length);
    for (let i = 0; i < length; i++) {
      arrayTarget[i] = clone(source[i]);
    }
    return arrayTarget;
  }
  if (source.constructor == Date) {
    const dateTarget = /* @__PURE__ */ new Date(+source);
    return dateTarget;
  }
  const objectTarget = {};
  for (const key in source) {
    if (hasOwnProperty.call(source, key)) {
      objectTarget[key] = clone(source[key]);
    }
  }
  return objectTarget;
}

// src/diff.ts
var import_deep_equal = __toESM(require("deep-equal"));
function isDestructive({ op }) {
  return op === "remove" || op === "replace" || op === "copy" || op === "move";
}
function subtract(minuend, subtrahend) {
  const obj = {};
  for (const add_key in minuend) {
    if (hasOwnProperty.call(minuend, add_key) && minuend[add_key] !== void 0) {
      obj[add_key] = 1;
    }
  }
  for (const del_key in subtrahend) {
    if (hasOwnProperty.call(subtrahend, del_key) && subtrahend[del_key] !== void 0) {
      delete obj[del_key];
    }
  }
  return Object.keys(obj);
}
function intersection(objects) {
  const length = objects.length;
  const counter = {};
  for (let i = 0; i < length; i++) {
    const object = objects[i];
    for (const key in object) {
      if (hasOwnProperty.call(object, key) && object[key] !== void 0) {
        counter[key] = (counter[key] || 0) + 1;
      }
    }
  }
  for (const key in counter) {
    if (counter[key] < length) {
      delete counter[key];
    }
  }
  return Object.keys(counter);
}
function isArrayAdd(array_operation) {
  return array_operation.op === "add";
}
function isArrayRemove(array_operation) {
  return array_operation.op === "remove";
}
function buildOperations(memo, i, j) {
  var memoized = memo[i][j];
  if (!memoized) {
    throw new Error("invalid memo");
  }
  let operations = [];
  while (memoized && memoized.prev && memoized.operation) {
    operations.push(memoized.operation);
    const index = memoized.prev.split(",");
    memoized = memo[Number(index[0])][Number(index[1])];
  }
  return operations.reverse();
}
function diffArrays(input, output, ptr, diff = diffAny) {
  if (diff === void 0) {
    diff = diffAny;
  }
  var input_length = isNaN(input.length) || input.length <= 0 ? 0 : input.length;
  var output_length = isNaN(output.length) || output.length <= 0 ? 0 : output.length;
  var input_end = input_length;
  var output_end = output_length;
  while (input_end > 0 && output_end > 0) {
    if ((0, import_deep_equal.default)(input[input_end - 1], output[output_end - 1])) {
      input_end--;
      output_end--;
    } else {
      break;
    }
  }
  const memo = new Array(input_end + 1);
  for (var i = 0; i <= input_end; i++) {
    memo[i] = new Array(output_end + 1);
  }
  memo[0][0] = { prev: null, operation: null, cost: 0 };
  for (let i2 = 0; i2 <= input_end; i2++) {
    for (let j = 0; j <= output_end; j++) {
      var memoized = memo[i2][j];
      if (memoized)
        continue;
      const add_prev_key = `${i2},${j - 1}`;
      const remove_prev_key = `${i2 - 1},${j}`;
      const replace_prev_key = `${i2 - 1},${j - 1}`;
      var remove_operation = {
        op: "remove",
        index: i2 - 1
      };
      var add_operation = {
        op: "add",
        index: i2 - 1,
        value: output[j - 1]
      };
      if (j === 0) {
        memoized = { prev: remove_prev_key, operation: remove_operation, cost: memo[i2 - 1][j].cost + 1 };
      } else if (i2 === 0) {
        memoized = { prev: add_prev_key, operation: add_operation, cost: memo[i2][j - 1].cost + 1 };
      } else {
        if ((0, import_deep_equal.default)(input[i2 - 1], output[j - 1])) {
          memoized = memo[i2 - 1][j - 1];
        } else {
          const remove_prev = memo[i2 - 1][j];
          const add_prev = memo[i2][j - 1];
          const replace_prev = memo[i2 - 1][j - 1];
          const min_cost = Math.min(replace_prev.cost, add_prev.cost, remove_prev.cost);
          if (remove_prev.cost === min_cost) {
            memoized = { prev: remove_prev_key, operation: remove_operation, cost: memo[i2 - 1][j].cost + 1 };
          } else if (add_prev.cost === min_cost) {
            memoized = { prev: add_prev_key, operation: add_operation, cost: memo[i2][j - 1].cost + 1 };
          } else {
            var replace_operation = {
              op: "replace",
              index: i2 - 1,
              original: input[i2 - 1],
              value: output[j - 1]
            };
            memoized = { prev: replace_prev_key, operation: replace_operation, cost: memo[i2 - 1][j - 1].cost + 1 };
          }
        }
      }
      memo[i2][j] = memoized;
    }
  }
  var array_operations = buildOperations(memo, input_end, output_end);
  const [padded_operations] = array_operations.reduce(([operations, padding], array_operation) => {
    if (isArrayAdd(array_operation)) {
      const padded_index = array_operation.index + 1 + padding;
      const index_token = padded_index < input_length + padding ? String(padded_index) : "-";
      const operation = {
        op: array_operation.op,
        path: ptr.add(index_token).toString(),
        value: array_operation.value
      };
      return [operations.concat(operation), padding + 1];
    } else if (isArrayRemove(array_operation)) {
      const operation = {
        op: array_operation.op,
        path: ptr.add(String(array_operation.index + padding)).toString()
      };
      return [operations.concat(operation), padding - 1];
    } else {
      const replace_ptr = ptr.add(String(array_operation.index + padding));
      const replace_operations = diff(array_operation.original, array_operation.value, replace_ptr);
      return [operations.concat(...replace_operations), padding];
    }
  }, [[], 0]);
  return padded_operations;
}
function diffObjects(input, output, ptr, diff = diffAny) {
  const operations = [];
  subtract(input, output).forEach((key) => {
    operations.push({ op: "remove", path: ptr.add(key).toString() });
  });
  subtract(output, input).forEach((key) => {
    operations.push({ op: "add", path: ptr.add(key).toString(), value: output[key] });
  });
  intersection([input, output]).forEach((key) => {
    operations.push(...diff(input[key], output[key], ptr.add(key)));
  });
  return operations;
}
function diffAny(input, output, ptr, diff = diffAny) {
  if (input === output) {
    return [];
  }
  const input_type = objectType(input);
  const output_type = objectType(output);
  if (input_type == "array" && output_type == "array") {
    return diffArrays(input, output, ptr, diff);
  }
  if (input_type == "object" && output_type == "object") {
    return diffObjects(input, output, ptr, diff);
  }
  return [{ op: "replace", path: ptr.toString(), value: output }];
}

// src/patch.ts
var MissingError = class extends Error {
  constructor(path) {
    super(`Value required at path: ${path}`);
    this.path = path;
    this.name = "MissingError";
  }
};
var TestError = class extends Error {
  constructor(actual, expected) {
    super(`Test failed: ${actual} != ${expected}`);
    this.actual = actual;
    this.expected = expected;
    this.name = "TestError";
  }
};
function _add(object, key, value) {
  if (Array.isArray(object)) {
    if (key == "-") {
      object.push(value);
    } else {
      const index = parseInt(key, 10);
      object.splice(index, 0, value);
    }
  } else {
    object[key] = value;
  }
}
function _remove(object, key) {
  if (Array.isArray(object)) {
    const index = parseInt(key, 10);
    object.splice(index, 1);
  } else {
    delete object[key];
  }
}
function add(object, operation) {
  const endpoint = Pointer.fromJSON(operation.path).evaluate(object);
  if (endpoint.parent === void 0) {
    return new MissingError(operation.path);
  }
  _add(endpoint.parent, endpoint.key, clone(operation.value));
  return null;
}
function remove(object, operation) {
  const endpoint = Pointer.fromJSON(operation.path).evaluate(object);
  if (endpoint.value === void 0) {
    return new MissingError(operation.path);
  }
  _remove(endpoint.parent, endpoint.key);
  return null;
}
function replace(object, operation) {
  const endpoint = Pointer.fromJSON(operation.path).evaluate(object);
  if (endpoint.parent === null) {
    return new MissingError(operation.path);
  }
  if (Array.isArray(endpoint.parent)) {
    if (parseInt(endpoint.key, 10) >= endpoint.parent.length) {
      return new MissingError(operation.path);
    }
  } else if (endpoint.value === void 0) {
    return new MissingError(operation.path);
  }
  endpoint.parent[endpoint.key] = operation.value;
  return null;
}
function move(object, operation) {
  const from_endpoint = Pointer.fromJSON(operation.from).evaluate(object);
  if (from_endpoint.value === void 0) {
    return new MissingError(operation.from);
  }
  const endpoint = Pointer.fromJSON(operation.path).evaluate(object);
  if (endpoint.parent === void 0) {
    return new MissingError(operation.path);
  }
  _remove(from_endpoint.parent, from_endpoint.key);
  _add(endpoint.parent, endpoint.key, from_endpoint.value);
  return null;
}
function copy(object, operation) {
  const from_endpoint = Pointer.fromJSON(operation.from).evaluate(object);
  if (from_endpoint.value === void 0) {
    return new MissingError(operation.from);
  }
  const endpoint = Pointer.fromJSON(operation.path).evaluate(object);
  if (endpoint.parent === void 0) {
    return new MissingError(operation.path);
  }
  _add(endpoint.parent, endpoint.key, clone(from_endpoint.value));
  return null;
}
function test(object, operation) {
  const endpoint = Pointer.fromJSON(operation.path).evaluate(object);
  if (diffAny(endpoint.value, operation.value, new Pointer()).length) {
    return new TestError(endpoint.value, operation.value);
  }
  return null;
}
var InvalidOperationError = class extends Error {
  constructor(operation) {
    super(`Invalid operation: ${operation.op}`);
    this.operation = operation;
    this.name = "InvalidOperationError";
  }
};
function apply(object, operation) {
  switch (operation.op) {
    case "add":
      return add(object, operation);
    case "remove":
      return remove(object, operation);
    case "replace":
      return replace(object, operation);
    case "move":
      return move(object, operation);
    case "copy":
      return copy(object, operation);
    case "test":
      return test(object, operation);
  }
  return new InvalidOperationError(operation);
}

// src/index.ts
function applyPatch(object, patch) {
  return patch.map((operation) => apply(object, operation));
}
function wrapVoidableDiff(diff) {
  function wrappedDiff(input, output, ptr) {
    const custom_patch = diff(input, output, ptr);
    return Array.isArray(custom_patch) ? custom_patch : diffAny(input, output, ptr, wrappedDiff);
  }
  return wrappedDiff;
}
function createPatch(input, output, diff) {
  const ptr = new Pointer();
  return (diff ? wrapVoidableDiff(diff) : diffAny)(input, output, ptr);
}
function createTest(input, path) {
  const endpoint = Pointer.fromJSON(path).evaluate(input);
  if (endpoint !== void 0) {
    return { op: "test", path, value: endpoint.value };
  }
}
function createTests(input, patch) {
  const tests = new Array();
  patch.filter(isDestructive).forEach((operation) => {
    const pathTest = createTest(input, operation.path);
    if (pathTest)
      tests.push(pathTest);
    if ("from" in operation) {
      const fromTest = createTest(input, operation.from);
      if (fromTest)
        tests.push(fromTest);
    }
  });
  return tests;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Pointer,
  applyPatch,
  createPatch,
  createTests
});
//# sourceMappingURL=index.js.map
