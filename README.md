# Fast TypeScript Transpiler (FTST) loader for webpack

<br />
<p align="center">
  <h3 align="center">ftst-loader</h3>

  <p align="center">
    This is the FTST loader for webpack. (Based on TS loader)
    <br />
    <br />
  </p>
</p>

## Table of Contents

<!-- toc -->

- [Getting Started](#getting-started)
  * [Installation](#installation)
  * [Running](#running)
  * [Examples](#examples)
  * [Faster Builds](#faster-builds)
  * [Yarn Plug’n’Play](#yarn-plugnplay)
  * [Babel](#babel)
  * [Parallelising Builds](#parallelising-builds)
  * [Compatibility](#compatibility)
  * [Configuration](#configuration)
    + [`devtool` / sourcemaps](#devtool--sourcemaps)
  * [Code Splitting and Loading Other Resources](#code-splitting-and-loading-other-resources)
  * [Declarations (.d.ts)](#declarations-dts)
  * [Failing the build on TypeScript compilation error](#failing-the-build-on-typescript-compilation-error)
  * [`baseUrl` / `paths` module resolution](#baseurl--paths-module-resolution)
  * [Options](#options)
  * [Loader Options](#loader-options)
    + [transpileOnly](#transpileonly)
    + [happyPackMode](#happypackmode)
    + [resolveModuleName and resolveTypeReferenceDirective](#resolvemodulename-and-resolvetypereferencedirective)
    + [getCustomTransformers](#getcustomtransformers)
    + [logInfoToStdOut](#loginfotostdout)
    + [logLevel](#loglevel)
    + [silent](#silent)
    + [ignoreDiagnostics](#ignorediagnostics)
    + [reportFiles](#reportfiles)
    + [compiler](#compiler)
    + [configFile](#configfile)
    + [colors](#colors)
    + [errorFormatter](#errorformatter)
    + [compilerOptions](#compileroptions)
    + [instance](#instance)
    + [appendTsSuffixTo](#appendtssuffixto)
    + [appendTsxSuffixTo](#appendtsxsuffixto)
    + [onlyCompileBundledFiles](#onlycompilebundledfiles)
    + [allowTsInNodeModules](#allowtsinnodemodules)
    + [context](#context)
    + [experimentalFileCaching](#experimentalfilecaching)
    + [projectReferences](#projectreferences)
  * [Usage with webpack watch](#usage-with-webpack-watch)
  * [Hot Module replacement](#hot-module-replacement)
- [Contributing](#contributing)
- [License](#license)

<!-- tocstop -->

## Getting Started

### Installation

```
npm install ftst-loader --save-dev
```

You will also need to install TypeScript if you have not already.

```
npm install typescript --save-dev
```

### Running

Use webpack like normal, including `webpack --watch` and `webpack-dev-server`, or through another
build system using the [Node.js API](http://webpack.github.io/docs/node.js-api.html).

### Compatibility

* TypeScript: 2.4.1+
* webpack: 4.x+ 
* node: 6.11.5 minimum (aligned with webpack 4)

If you become aware of issues not caught by the test suite then please let us know. Better yet, write a test and submit it in a PR!

### Configuration

1. Create or update `webpack.config.js` like so:

   ```javascript
   module.exports = {
     mode: "development",
     devtool: "inline-source-map",
     entry: "./app.ts",
     output: {
       filename: "bundle.js"
     },
     resolve: {
       // Add `.ts` and `.tsx` as a resolvable extension.
       extensions: [".ts", ".tsx", ".js"]
     },
     module: {
       rules: [
         // all files with a `.ts` or `.tsx` extension will be handled by `ftst-loader`
         { test: /\.tsx?$/, loader: "ftst-loader" }
       ]
     }
   };
   ```

### Options

There are two types of options: TypeScript options (aka "compiler options") and loader options. TypeScript options should be set using a tsconfig.json file. Loader options can be specified through the `options` property in the webpack configuration:

```javascript
module.exports = {
  ...
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: [
          {
            loader: 'ftst-loader',
            options: {
              transpileOnly: true
            }
          }
        ]
      }
    ]
  }
}
```

### Loader Options

#### transpileOnly
| Type | Default Value |
|------|--------------|
| `boolean` | `false`|

If you want to speed up compilation significantly you can set this flag.
However, many of the benefits you get from static type checking between
different dependencies in your application will be lost.

It's advisable to use `transpileOnly` alongside the [fork-ts-checker-webpack-plugin](https://github.com/Realytics/fork-ts-checker-webpack-plugin) to get full type checking again. To see what this looks like in practice then either take a look at [our simple example](examples/fork-ts-checker-webpack-plugin). For a more complex setup take a look at our [more involved example](examples/react-babel-karma-gulp).

If you enable this option, webpack 4 will give you "export not found" warnings any time you re-export a type:

```
WARNING in ./src/bar.ts
1:0-34 "export 'IFoo' was not found in './foo'
 @ ./src/bar.ts
 @ ./src/index.ts
```

The reason this happens is that when typescript doesn't do a full type check, it does not have enough information to determine whether an imported name is a type or not, so when the name is then exported, typescript has no choice but to emit the export. Fortunately, the extraneous export should not be harmful, so you can just suppress these warnings:

```javascript
module.exports = {
  ...
  stats: {
    warningsFilter: /export .* was not found in/
  }
}
```

#### happyPackMode
| Type | Default Value |
|------|--------------|
| `boolean` | `false`|

If you're using [HappyPack](https://github.com/amireh/happypack) or [thread-loader](https://github.com/webpack-contrib/thread-loader) to parallise your builds then you'll need to set this to `true`. This implicitly sets `*transpileOnly*` to `true` and **WARNING!** stops registering **_all_** errors to webpack.

It's advisable to use this with the [fork-ts-checker-webpack-plugin](https://github.com/Realytics/fork-ts-checker-webpack-plugin) to get full type checking again. To see what this looks like in practice then either take a look at [our simple thread-loader example](examples/thread-loader). **_IMPORTANT_**: If you are using fork-ts-checker-webpack-plugin alongside HappyPack or thread-loader then ensure you set the `checkSyntacticErrors` option like so:

```javascript
        new ForkTsCheckerWebpackPlugin({ checkSyntacticErrors: true })
```

This will ensure that the plugin checks for both syntactic errors (eg `const array = [{} {}];`) and semantic errors (eg `const x: number = '1';`). By default the plugin only checks for semantic errors (as when used with `ftst-loader` in `transpileOnly` mode, `ftst-loader` will still report syntactic errors).

Also, if you are using `thread-loader` in watch mode, remember to set `poolTimeout: Infinity` so workers don't die.

#### resolveModuleName and resolveTypeReferenceDirective

These options should be functions which will be used to resolve the import statements and the `<reference types="...">` directives instead of the default TypeScript implementation. It's not intended that these will typically be used by a user of `ftst-loader` - they exist to facilitate functionality such as [Yarn Plug’n’Play](https://yarnpkg.com/en/docs/pnp).

#### getCustomTransformers
| Type |
|------|
| ` (program: Program) => { before?: TransformerFactory<SourceFile>[]; after?: TransformerFactory<SourceFile>[]; } ` |

Provide custom transformers - only compatible with TypeScript 2.3+ (and 2.4 if using `transpileOnly` mode). For example usage take a look at [typescript-plugin-styled-components](https://github.com/Igorbek/typescript-plugin-styled-components) or our [test](test/comparison-tests/customTransformer).

You can also pass a path string to locate a js module file which exports the function described above, this useful especially in `happyPackMode`. (Because forked processes cannot serialize functions see more at [related issue](https://github.com/Igorbek/typescript-plugin-styled-components/issues/6#issue-303387183))

#### logInfoToStdOut
| Type | Default Value |
|------|--------------|
| `boolean` | `false`|

This is important if you read from stdout or stderr and for proper error handling.
The default value ensures that you can read from stdout e.g. via pipes or you use webpack -j to generate json output.

#### logLevel
| Type | Default Value |
|------|--------------|
| `string` | `warn` |

Can be `info`, `warn` or `error` which limits the log output to the specified log level.
Beware of the fact that errors are written to stderr and everything else is written to stderr (or stdout if logInfoToStdOut is true).

#### silent
| Type | Default Value |
|------|--------------|
| `boolean` | `false`|

If `true`, no console.log messages will be emitted. Note that most error
messages are emitted via webpack which is not affected by this flag.

#### ignoreDiagnostics
| Type | Default Value |
|------|--------------|
| `number[]` | `[]`|

You can squelch certain TypeScript errors by specifying an array of diagnostic
codes to ignore.

#### reportFiles
| Type | Default Value |
|------|--------------|
| `string[]` | `[]`|

Only report errors on files matching these glob patterns.

```javascript
  // in webpack.config.js
  {
    test: /\.ts$/,
    loader: 'ftst-loader',
    options: { reportFiles: ['src/**/*.{ts,tsx}', '!src/skip.ts'] }
  }
```

This can be useful when certain types definitions have errors that are not fatal to your application.

#### compiler
| Type | Default Value |
|------|--------------|
| `string` | `'typescript'`|

Allows use of TypeScript compilers other than the official one. Should be
set to the NPM name of the compiler, eg [`ntypescript`](https://github.com/basarat/ntypescript).

#### configFile
| Type | Default Value |
|------|--------------|
| `string` | `'tsconfig.json'`|

Allows you to specify where to find the TypeScript configuration file.

You may provide

* just a file name. The loader then will search for the config file of each entry point in the respective entry point's containing folder. If a config file cannot be found there, it will travel up the parent directory chain and look for the config file in those folders.
* a relative path to the configuration file. It will be resolved relative to the respective `.ts` entry file.
* an absolute path to the configuration file.

Please note, that if the configuration file is outside of your project directory, you might need to set the `context` option to avoid TypeScript issues (like TS18003).
In this case the `configFile` should point to the `tsconfig.json` and `context` to the project root.

#### colors
| Type | Default Value |
|------|--------------|
| `boolean` | `true`|

If `false`, disables built-in colors in logger messages.

#### errorFormatter
| Type | Default Value |
|------|--------------|
| `(message: ErrorInfo, colors: boolean) => string` | `undefined`|

By default `ftst-loader` formats TypeScript compiler output for an error or a warning in the style:

```
[tsl] ERROR in myFile.ts(3,14)
      TS4711: you did something very wrong
```

If that format is not to your taste you can supply your own formatter using the `errorFormatter` option. Below is a template for a custom error formatter. Please note that the `colors` parameter is an instance of [`chalk`](https://github.com/chalk/chalk) which you can use to color your output. (This instance will respect the `colors` option.)

```javascript
function customErrorFormatter(error, colors) {
  const messageColor =
    error.severity === "warning" ? colors.bold.yellow : colors.bold.red;
  return (
    "Does not compute.... " +
    messageColor(Object.keys(error).map(key => `${key}: ${error[key]}`))
  );
}
```

If the above formatter received an error like this:

```json
{
  "code":2307,
  "severity": "error",
  "content": "Cannot find module 'components/myComponent2'.",
  "file":"/.test/errorFormatter/app.ts",
  "line":2,
  "character":31
}
```

It would produce an error message that said:

```
Does not compute.... code: 2307,severity: error,content: Cannot find module 'components/myComponent2'.,file: /.test/errorFormatter/app.ts,line: 2,character: 31
```

And the bit after "Does not compute.... " would be red.

#### compilerOptions
| Type | Default Value |
|------|--------------|
| `object` | `{}`|

Allows overriding TypeScript options. Should be specified in the same format
as you would do for the `compilerOptions` property in tsconfig.json.

## License

MIT License
