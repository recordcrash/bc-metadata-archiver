// utils.js

/*
Normalize file names to replace illegal characters and convert to lowercase.
*/
function normalizeFileName(string, repl = "-", directory = false) {
    if (directory) {
        return normalizeFileName(string, repl, false).replace(/^\.|\.+$/g, "").toLowerCase();
    } else {
        return string.replace(/[\\/:*?"<>|\t]|\ +$/g, repl).toLowerCase();
    }
}

/*
Normalize track names according to specific rules.
*/
function normalizeTrackName(trackName) {
    trackName = trackName.replace(/\s+/g, '-'); // Replace spaces with dashes
    trackName = trackName.replace(/&/g, 'and'); // Replace & with "and"
    trackName = trackName.replace(/[^a-zA-Z0-9-]/g, ''); // Remove non-alphanumeric except dashes
    trackName = trackName.replace(/-{2,}/g, '-'); // Replace multiple dashes with a single dash
    trackName = trackName.replace(/^-+|-+$/g, '').toLowerCase(); // Trim dashes and lowercase
    return trackName;
}

/*
Set the browser action icon and title.
*/
function setActionState(tabId, title, iconPath) {
    browser.action.setTitle({ tabId, title });
    browser.action.setIcon({ tabId, path: iconPath });
}

/*
Get the file extension based on the URL pattern or verify using an image element.
Assume PNG, and if it fails, default to JPG.
(This doesn't actually work due to how stupid Bandcamp's image serving is. For now, users will have to manually check the image extension.)
*/
function verifyImageAndDetermineExtension(url) {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => {
            resolve('.png');
        };
        image.onerror = () => {
            resolve('.jpg');
        };
        image.src = url;
    });
}

/*
Download the art using the specified URL and normalized title.
*/
async function downloadArtDirectly(url, albumName, normalizedTitle, isCover = false) {
    try {
        const extension = await verifyImageAndDetermineExtension(url);
        const fileName = isCover 
            ? `${albumName}/album-art/${albumName}/cover${extension}`
            : `${albumName}/album-art/${albumName}/${normalizedTitle}${extension}`;

        await browser.downloads.download({
            url: url,
            filename: fileName,
            conflictAction: 'overwrite', // Overwrite existing files
            saveAs: false
        }).then(downloadId => {
            console.log(`Download started with ID: ${downloadId}`);
        }).catch(error => {
            console.error("Download failed: ", error);
        });
    } catch (error) {
        console.error("Failed to determine file extension:", error);
    }
}

/*
Create an empty YAML file in the album directory.
*/
function createEmptyYamlFile(albumName) {
    const fileName = `${albumName}/album/${albumName}.yaml`;

    // Create a Blob to represent the empty YAML file
    const blob = new Blob([''], { type: 'text/yaml' });
    const objectUrl = URL.createObjectURL(blob);

    return browser.downloads.download({
        url: objectUrl,
        filename: fileName,
        conflictAction: 'overwrite', // Overwrite existing file
        saveAs: false
    }).then(downloadId => {
        console.log(`YAML file created with ID: ${downloadId}`);
        URL.revokeObjectURL(objectUrl);
    }).catch(error => {
        console.error("Failed to create YAML file: ", error);
        URL.revokeObjectURL(objectUrl);
    });
}

/*
Returns true only if the URL is a valid Bandcamp album URL.
*/
function urlIsApplicable(urlString) {
    const BANDCAMP_URL_REGEX = /https:\/\/[a-zA-Z0-9-]+\.bandcamp\.com\/(album|track)\/[a-zA-Z0-9-]+/;
    const isBandcamp = BANDCAMP_URL_REGEX.test(urlString);
    console.log("URL is Bandcamp: " + isBandcamp);
    return isBandcamp;
}

export { 
    normalizeFileName, 
    normalizeTrackName, 
    setActionState, 
    downloadArtDirectly, 
    createEmptyYamlFile, 
    urlIsApplicable 
};
