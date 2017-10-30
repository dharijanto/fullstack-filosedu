## Abstract
This repo showcases a simplest way of doing NodeJS-style programming
in web frontend.

## Libraries Used:
1. browserify: Allows node-style 'require' module-management.
2. browserify-shim: Allows using non-NPM modules with browserify
3. babelify: JS Transpiler
4. babel-presets-es2015: ES6 -> ES5 presets.
5. uglifyify: uglify the resulting code
6. watchify: watch capability for browserify

## Project Structure:
1. Coding entry-point is main.js
2. Transpilation is done through run.js
3. bundle.js is the final result to be included by the browser

## Commands
1. npm start: use watchify to efficiently watch for file changes and trigger re-building
2. npm build: build once
3. npm buildManually: same as (2) but using browserify cli
