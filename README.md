<p align="center">
  <img src="https://github.com/kvoon3/vscode-eslint-codemod/blob/main/res/logo.png?raw=true" height="150" />
</p>

<h1 align="center">ESLint Codemod<sup>VS Code</sup></h1>

<p align="center">
  <a href="https://img.shields.io/visual-studio-marketplace/v/kvoon.vscode-eslint-codemod" target="__blank"><img alt="Visual Studio Marketplace Version" src="https://img.shields.io/visual-studio-marketplace/v/kvoon.vscode-eslint-codemod?label=VS%20Code%20Marketplace&style=flat&color=%2373C1FF&labelColor=%230078D7"></a>
  <a href="https://kermanx.github.io/reactive-vscode/" target="__blank"><img src="https://img.shields.io/badge/made_with-reactive--vscode-%23007ACC?style=flat&labelColor=%23229863"  alt="Made with reactive-vscode" /></a>
</p>

<p align="center">Supercharge <a href="https://eslint-plugin-command.antfu.me">eslint-plugin-command</a> in VS Code</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/kvoon3/vscode-eslint-codemod/refs/heads/main/res/screenshot-diff.png" />
  <img src="https://raw.githubusercontent.com/kvoon3/vscode-eslint-codemod/refs/heads/main/res/screenshot.png" />
</p>

> [!TIP]
> Cannot see suggestion detail?
> Try open it by keyboard shortcut. See: [VSCode intellisense](https://code.visualstudio.com/docs/editing/intellisense#_keyboard-shortcuts)

### ⚡ Intelligent Autocomplete

Reducing manual typing and mental tax.

### 🔧 One-Click Auto Fix

Apply transformations instantly — no `eslint --fix` or `formatOnSave` required.

### 🔍 Preview Changes Before Apply

See a clear diff of what will change.

### 📖 User-Friendly Documentation Hints

In-editor documentation (disabled by default).

## Configurations

<!-- configs -->

| Key                                  | Description                     | Type      | Default          |
| ------------------------------------ | ------------------------------- | --------- | ---------------- |
| `eslintCodemod.enable`               | Whether enable extension        | `boolean` | `true`           |
| `eslintCodemod.languageIds`          |                                 | `array`   | `["*"]`          |
| `eslintCodemod.autocomplete.autoFix` | Auto-fix code on autocomplete   | `boolean` | `true`           |
| `eslintCodemod.autocomplete.docs`    | Show docs for suggestions       | `boolean` | `false`          |
| `eslintCodemod.autocomplete.diff`    | Preview changes before applying | `boolean` | `true`           |
| `eslintCodemod.alias`                |                                 | `object`  | See package.json |

<!-- configs -->

## Commands

<!-- commands -->

| Command                       | Title                                                       |
| ----------------------------- | ----------------------------------------------------------- |
| `eslintCodemod.toggleAutoFix` | ESLint codemod: Toggle `autocomplete.autoFix` configuration |

<!-- commands -->

## Todos

- [x] Preview code changes
- [ ] Alias support
- [ ] Lazy input

## License

[MIT](./LICENSE.md) License © 2025 [Kevin Kwong](https://github.com/kvoon3)
