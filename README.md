<p align="center">
<img  src="https://eslint-plugin-command.antfu.me/logo.svg" height="150" />
</p>

<h1 align="center">ESLint Codemod<sup>VS Code</sup></h1>

<p align="center">
  <a href="https://kermanx.github.io/reactive-vscode/" target="__blank"><img src="https://img.shields.io/badge/made_with-reactive--vscode-%23007ACC?style=flat&labelColor=%23229863"  alt="Made with reactive-vscode" /></a>
</p>

<p align="center">Supercharge <a href="https://eslint-plugin-command.antfu.me">eslint-plugin-command</a> in VS Code</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/kvoon3/vscode-eslint-codemod/refs/heads/main/res/screenshot.png" />
</p>

## Why ?

### ⚡ Intelligent Autocomplete

Context-aware suggestions for command, reducing manual typing and mental tax.

### 🔧 One-Click Auto Fix

Apply transformations instantly — no `eslint --fix` or `formatOnSave` required.

### 📖 User-Friendly Documentation Hints

In-editor guidance with examples, helping your master Comment-as-command.

## Configurations

<!-- configs -->

| Key                                  | Description                            | Type      | Default                       |
| ------------------------------------ | -------------------------------------- | --------- | ----------------------------- |
| `eslintCodemod.languageIds`          |                                        | `array`   | `["typescript","javascript"]` |
| `eslintCodemod.autocomplete.autoFix` | Auto fix code when autocomplete finish | `boolean` | `true`                        |

<!-- configs -->

## Commands

<!-- commands -->

| Command                       | Title                                                       |
| ----------------------------- | ----------------------------------------------------------- |
| `eslintcodemod.toggleAutoFix` | ESLint codemod: Toggle `autocomplete.autoFix` configuration |

<!-- commands -->

## License

[MIT](./LICENSE.md) License © 2025 [Kevin Kwong](https://github.com/kvoon3)
