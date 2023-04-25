"use strict";
/**
This module is prefixed with an underscore so that ava recognizes it as a helper,
instead of failing the entire test suite with a "No tests found" error.
*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.resultName = void 0;
function resultName(result) {
    return result ? result.name : result;
}
exports.resultName = resultName;
