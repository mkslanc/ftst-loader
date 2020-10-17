var {Parser} = require('acorn');
var stage3 = require('acorn-stage3');

var Module = require("module")
var filepath = require.resolve("webpack")
var acornPath = Module._resolveFilename("acorn", {
    paths: Module._nodeModulePaths(filepath),
    filename: filepath,
    id: filepath,
});
var webpackAcorn = require(acornPath)
var stage3Parser = Parser.extend(stage3)
Object.keys(require.cache).forEach((key) => {
    let el = require.cache[key];
    if (el.exports && el.exports.Parser && el.exports.Parser.parse && el.exports.Parser != Parser) {
        el.exports.Parser.parse = function (code, options) {
            options.ecmaVersion = 13
            try {
                return stage3Parser.parse(code, options)
            } catch (e) {
                console.error(e)
            }
        }
    }
})

var loader = require('./dist');

module.exports = loader;