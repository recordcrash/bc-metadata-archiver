// background.js

const ACTION_TITLE_APPLY = "Download Metadata";
const ACTION_TITLE_REMOVE = "Cancel Download";
const BANDCAMP_URL_REGEX = /https:\/\/[a-zA-Z0-9-]+\.bandcamp\.com\/(album|track)\/[a-zA-Z0-9-]+/;

/*
Toggle action status: if it's downloading, cancel it; if it's not, download metadata.
*/
function toggleStatus(tab) {
    // Get the current action title to decide whether to start or cancel the download
    browser.action.getTitle({ tabId: tab.id }).then((currentTitle) => {
        if (currentTitle === ACTION_TITLE_APPLY) {
            startDownload(tab);
        } else {
            cancelDownload(tab);
        }
    }).catch(error => {
        console.error("Failed to get action title: ", error);
    });
}

/*
Start download process for the current album.
*/
function startDownload(tab) {
    console.log("Starting download for " + tab.url);
    // Set the icon and title to indicate download is in progress
    browser.action.setTitle({ tabId: tab.id, title: ACTION_TITLE_REMOVE });
    browser.action.setIcon({ tabId: tab.id, path: "icons/on.svg" });

    // Request album metadata from the content script
    browser.tabs.sendMessage(tab.id, { action: 'getTrackInfo' }).then((response) => {
        if (response && response.artUrl) {
            console.log(`Album Art URL: ${response.artUrl}`);
            console.log(`Album Title: ${response.title}`);
            
            // Download album art
            downloadArt(response.artUrl, response.title);
        } else {
            console.error("Could not find album information.");
            alert("Could not find album information on this page.");
        }

        // Now handle each track
        extractTracksAndDownload(tab);
    }).catch(error => {
        console.error("Failed to retrieve album metadata: ", error);
        cancelDownload(tab);
    });
}

/*
Extract track URLs and initiate downloads for each.
*/
function extractTracksAndDownload(tab) {
    // Request track URLs from the content script
    browser.tabs.sendMessage(tab.id, { action: 'getTrackList' }).then((response) => {
        if (response && response.trackLinks) {
            console.log("Extracted track URLs:", response.trackLinks);

            response.trackLinks.forEach(track => {
                console.log("Opening track URL: ", track.url);
                // Open each track in a new tab
                browser.tabs.create({ url: track.url, active: false }).then(newTab => {
                    // Wait for the tab to fully load before extracting data
                    browser.tabs.onUpdated.addListener(function listener(tabId, changeInfo) {
                        if (tabId === newTab.id && changeInfo.status === 'complete') {
                            browser.tabs.onUpdated.removeListener(listener);
                            handleTrackTab(newTab.id, track.title);
                        }
                    });
                }).catch(error => {
                    console.error("Failed to create tab for track: ", error);
                });
            });
        } else {
            console.error("No track links found.");
        }
    }).catch(error => {
        console.error("Error extracting track URLs: ", error);
    });
}

/*
Handle extraction and download of track data from a specific tab.
*/
function handleTrackTab(tabId, trackTitle) {
    // Request track metadata from the content script
    browser.tabs.sendMessage(tabId, { action: 'getTrackInfo' }).then((response) => {
        if (response && response.artUrl) {
            console.log(`Track Art URL: ${response.artUrl}`);
            console.log(`Track Title: ${trackTitle}`);
            
            // Download track art
            downloadArt(response.artUrl, trackTitle);
        } else {
            console.error("Could not find track information.");
        }
    }).catch(error => {
        console.error("Failed to retrieve track metadata: ", error);
    }).finally(() => {
        // Close the tab once done
        browser.tabs.remove(tabId).catch(err => console.error("Failed to close tab: ", err));
    });
}

/*
Download the art using the specified URL and title.
*/
function downloadArt(artUrl, title) {
    browser.downloads.download({
        url: artUrl,
        filename: `${title}.jpg`,
        conflictAction: 'uniquify',
        saveAs: false
    }).then(downloadId => {
        console.log(`Download started with ID: ${downloadId}`);
    }).catch(error => {
        console.error("Download failed: ", error);
    });
}

/*
Cancel download page action: if it's downloading, cancel it.
Update the page action's title and icon to reflect its state.
*/
function cancelDownload(tab) {
    console.log("Download canceled for " + tab.url);
    browser.action.setTitle({ tabId: tab.id, title: ACTION_TITLE_APPLY });
    browser.action.setIcon({ tabId: tab.id, path: "icons/off.svg" });
    initializePageAction(tab);
}

/*
Returns true only if the URL is a valid Bandcamp album URL.
*/
function urlIsApplicable(urlString) {
    const isBandcamp = BANDCAMP_URL_REGEX.test(urlString);
    console.log("URL is Bandcamp: " + isBandcamp);
    return isBandcamp;
}

/*
Initialize the page action: set icon and title.
Only operates on tabs whose URL is applicable.
*/
function initializePageAction(tab) {
    if (urlIsApplicable(tab.url)) {
        // Set icon and title for applicable pages
        browser.action.setIcon({ tabId: tab.id, path: "icons/off.svg" });
        browser.action.setTitle({ tabId: tab.id, title: ACTION_TITLE_APPLY });
    } else {
        browser.action.setIcon({ tabId: tab.id, path: "icons/disabled.svg" });
        browser.action.setTitle({ tabId: tab.id, title: "Not a Bandcamp Album" });
    }
}

/*
Each time a tab is updated, reset the page action for that tab.
*/
browser.tabs.onUpdated.addListener((id, changeInfo, tab) => {
    if (changeInfo.url && urlIsApplicable(changeInfo.url)) {
        initializePageAction(tab);
    }
});

/*
Downloads metadata when the page action is clicked.
*/
browser.action.onClicked.addListener(toggleStatus);
