console.log("Bandcamp Metadata Archiver: Content script loaded.");

// Listen for messages from the background script
browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getTrackInfo') {
        console.log("Getting track info");

        // Ensure accessing elements only from the same origin
        const artElement = document.querySelector('#tralbumArt a.popupImage');
        const artUrl = artElement ? artElement.href : null;

        const titleElement = document.querySelector('h2.trackTitle') || document.querySelector('h3.trackTitle') || document.querySelector('.trackTitle');
        const title = titleElement ? titleElement.innerText.trim() : 'unknown';

        console.log(`Extracted art URL: ${artUrl}`);
        console.log(`Extracted title: ${title}`);

        // Send the extracted data back to the background script
        sendResponse({ artUrl, title });
    }

    if (request.action === 'getTrackList') {
        console.log("Getting track list");

        // Extract all track links from the page
        const trackLinks = Array.from(document.querySelectorAll('.track_list .title a')).map(link => {
            return {
                url: new URL(link.href, window.location.origin).href, // Ensure full URL
                title: link.querySelector('.track-title').innerText
            };
        });

        console.log("Extracted track links:", trackLinks);

        sendResponse({ trackLinks });
    }

    // Return true to indicate that we are sending a response asynchronously
    return true;
});
