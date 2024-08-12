# bc-metadata-archiver

**This add-on adds a button that allows archival of `bandcamp.com` album art, track art and other metadata.**

## What it does

This extension includes:

* a background script, "background.js" that deals with the action logic and opening track tabs
* a content script, "content.js" that deals with fetching the actual fetching of page data
* a page action that presents itself as an extension logo you can click

It adds the [page action](https://developer.mozilla.org/en-US/Add-ons/WebExtensions/API/pageAction)
to Bandcamp URLs. Clicking the page action icon will archive the album art, track art and metadata.

**Note that this extension does not archive music as that would be illegal.**

## How to develop

1. Clone this repository
2. Run `npm install` to install dependencies
3. Open Firefox and navigate to `about:debugging`
4. Click "This Firefox" on the left
5. Click "Load Temporary Add-on..."
6. Navigate to the cloned repository and select any file in the root directory
7. The extension should now be installed

## How to build

1. Run `npm run build` to build the extension
2. The built extension will be in the `dist` directory