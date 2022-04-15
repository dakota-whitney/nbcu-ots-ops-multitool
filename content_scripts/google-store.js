(async () => {
    const googleId = window.location.pathname.split("/").filter(path => path.match(/\d+/)).pop();
    console.log(`Google ID: ${googleId}`);
    const {otsAppMetadata} = await chrome.storage.local.get('otsAppMetadata');
    if(!otsAppMetadata) return;
    const {[googleId]:marketData} = otsAppMetadata;
    if(!marketData) return;
    chrome.runtime.onMessage.addListener((message,sender,sendResponse) => sendResponse({status:`Google Store received ${message.command} command and found data:\n${JSON.stringify(marketData)}`}));
})();