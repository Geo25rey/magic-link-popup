# magic-link-popup

An alternative interface for using [`magic-sdk`](https://www.npmjs.com/package/magic-sdk) on the web, which opens login requests in a popup window or new tab on mobile rather than redirecting to a new page. This is especially useful for SPAs. This library is framework agnostic, but if you are looking for something more opinionated towards React, check out [`magic-link-popup-react`](https://github.com/Geo25rey/magic-link-popup-react).

## Dev Scripts

- `dev` - starts dev server
- `build` - generates the following bundles: CommonJS (`.cjs`) ESM (`.mjs`) and IIFE (`.iife.js`). The name of bundle is automatically taken from `package.json` name property
- `test` - starts vitest and runs all tests
- `test:coverage` - starts vitest and run all tests with code coverage report
- `lint:scripts` - lint `.ts` files with eslint
- `lint:styles` - lint `.css` and `.scss` files with stylelint
- `format:scripts` - format `.ts`, `.html` and `.json` files with prettier
- `format:styles` - format `.cs` and `.scss` files with stylelint
- `format` - format all with prettier and stylelint
- `prepare` - script for setting up husky pre-commit hook
- `uninstall-husky` - script for removing husky from repository
- `release` - generates a new release and publishes it to npm and GitHub
