// background.js

// Import utility functions
import { 
    normalizeFileName, 
    normalizeTrackName, 
    setActionState, 
    downloadArtDirectly, 
    createEmptyYamlFile, 
    urlIsApplicable 
} from './utils.js';

const ACTION_TITLE_APPLY = "Download Metadata";
const ACTION_TITLE_REMOVE = "Cancel Download";

/*
Toggle action status: if it's downloading, cancel it; if it's not, download metadata.
*/
function toggleStatus(tab) {
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
    setActionState(tab.id, ACTION_TITLE_REMOVE, "icons/on.svg");

    // Request album metadata from the content script
    browser.tabs.sendMessage(tab.id, { action: 'getTrackInfo' }).then((response) => {
        if (response && response.artUrl) {
            console.log(`Album Art URL: ${response.artUrl}`);
            console.log(`Album Title: ${response.title}`);
            
            // Download album art as cover
            let albumArtUrl = response.artUrl.replace(/_10\.(jpg|png)$/, '_0.$1');
            const albumName = normalizeFileName(response.title, "-", true);

            downloadArtDirectly(albumArtUrl, albumName, "cover", true);

            // Create an empty YAML file for album metadata
            createEmptyYamlFile(albumName);
        } else {
            console.error("Could not find album information on this page.");
        }

        // Now handle each track
        extractTracksAndDownload(tab, response.title);
    }).catch(error => {
        console.error("Failed to retrieve album metadata: ", error);
        cancelDownload(tab);
    });
}

/*
Extract track URLs and initiate downloads for each.
*/
function extractTracksAndDownload(tab, albumTitle) {
    browser.tabs.sendMessage(tab.id, { action: 'getTrackList' }).then((response) => {
        if (response && response.trackLinks) {
            console.log("Extracted track URLs:", response.trackLinks);

            let remainingTracks = response.trackLinks.length;

            response.trackLinks.forEach(track => {
                console.log("Opening track URL: ", track.url);
                browser.tabs.create({ url: track.url, active: false }).then(newTab => {
                    browser.tabs.onUpdated.addListener(function listener(tabId, changeInfo) {
                        if (tabId === newTab.id && changeInfo.status === 'complete') {
                            browser.tabs.onUpdated.removeListener(listener);
                            handleTrackTab(newTab.id, track.title, albumTitle, () => {
                                remainingTracks--;
                                if (remainingTracks === 0) {
                                    finalizeDownloadProcess();
                                }
                            });
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
function handleTrackTab(tabId, trackTitle, albumTitle, callback) {
    browser.tabs.sendMessage(tabId, { action: 'getTrackInfo' }).then((response) => {
        if (response && response.artUrl) {
            console.log(`Track Art URL: ${response.artUrl}`);
            console.log(`Track Title: ${trackTitle}`);
            
            // Adjust the track art URL and normalize the track name
            let trackArtUrl = response.artUrl.replace(/_10\.(jpg|png)$/, '_0.$1');
            const normalizedTrackName = normalizeTrackName(trackTitle);
            const albumName = normalizeFileName(albumTitle, "-", true);

            downloadArtDirectly(trackArtUrl, albumName, normalizedTrackName);
        } else {
            console.error("Could not find track information.");
        }
    }).catch(error => {
        console.error("Failed to retrieve track metadata: ", error);
    }).finally(() => {
        browser.tabs.remove(tabId).catch(err => console.error("Failed to close tab: ", err));
        callback(); // Decrement the track counter and check if all are done
    });
}

/*
Finalize the download process: reset the icon and provide feedback.
*/
function finalizeDownloadProcess() {
    setActionState(null, ACTION_TITLE_APPLY, "icons/off.svg");
    console.log("Download complete!");
}

/*
Cancel download page action: if it's downloading, cancel it.
Update the page action's title and icon to reflect its state.
*/
function cancelDownload(tab) {
    console.log("Download canceled for " + tab.url);
    setActionState(tab.id, ACTION_TITLE_APPLY, "icons/off.svg");
    initializePageAction(tab);
}

/*
Initialize the page action: set icon and title.
Only operates on tabs whose URL is applicable.
*/
function initializePageAction(tab) {
    if (urlIsApplicable(tab.url)) {
        setActionState(tab.id, ACTION_TITLE_APPLY, "icons/off.svg");
    } else {
        setActionState(tab.id, "Not a Bandcamp Album", "icons/disabled.svg");
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
