import * as extension from './extension.js';
//Message listener
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log(`listener.js received ${message.request} request`)
    switch(message.request){
        case "start-exports":
            chrome.downloads.erase({query:['wp-personal-data-file']},() => {
                chrome.contentSettings.automaticDownloads.set({primaryPattern:`https://*/*`,setting:'allow'})
                chrome.power.requestKeepAwake('system');
                chrome.action.setBadgeText({text:'0'});
                chrome.storage.local.set({exportPageRequestCount:0,exportPageIndex:0})
                .then(() => chrome.windows.create({state:"minimized",url:`https://${extension.otsDomains[0]}/wp-admin/export-personal-data.php`}))
            });
        break;
        case "stop-exports":
            extension.stopExports("Exports were stopped by the extension UI");
        break;
    };
    return true; //Required if using async code above
});
chrome.downloads.onDeterminingFilename.addListener(async (download,suggest) => {
    console.log(`Download detected:`);
    console.log(download);
    if(download.filename.match('wp-personal-data-file')){
        suggest();
        const {exportPageRequestCount} = await chrome.storage.local.get('exportPageRequestCount');
        if(exportPageRequestCount && !download.filename.match(/\(\d\).zip$/)){
            let completedExports = await chrome.downloads.search({query:["wp-personal-data-file"]});
            completedExports.length >= 1000 ? chrome.action.setBadgeText({text:`1k+`}) : chrome.action.setBadgeText({text:`${completedExports.length}`});
            completedExports = Array.from(completedExports).filter(dataExport => dataExport.referrer == download.referrer);
            console.log(`Completed exports for market ${download.referrer.split("/")[2]}: ${completedExports.length} / ${exportPageRequestCount}`)
            let currentExportTab = await chrome.tabs.query({url:download.referrer});
            currentExportTab = currentExportTab[0];
            if(completedExports.length >= exportPageRequestCount){
                extension.openNextExportTab(currentExportTab)
            }else{
                let requestor = download.filename.split("-");
                requestor = requestor.slice(4,requestor.findIndex(elem => elem == "at"))[0].replaceAll(/\W/g,"").toLowerCase();
                chrome.tabs.sendMessage(currentExportTab.id,{command:'remove-request',requestor:requestor})
                .then(response => console.log(response.status))
                .catch(error => extension.stopExports(error.message));
            };
        };
    };
    return true;
});
//Download Erased Listener
chrome.downloads.onErased.addListener(download => console.log(`${download.filename} erased`));
//Storage listener
chrome.storage.onChanged.addListener((changes,namespace) => {
    for(let [key,{oldValue,newValue}] of Object.entries(changes)){
        console.log(`Storage key "${key}" in the "${namespace}" namespace has changed.\nOld value was:`);
        console.log(oldValue)
        console.log(`New value is:`);
        console.log(newValue);
    };
    chrome.storage[namespace].getBytesInUse(null).then(bytesInUse => {
        console.log(`Storage quota for "${namespace}" namespace: ${chrome.storage[namespace].QUOTA_BYTES}`);
        console.log(`Total bytes currently in use: ${bytesInUse}`);
        if(bytesInUse >= chrome.storage[namespace].QUOTA_BYTES){
            console.log(`ALERT: bytes used by this extension exceeded the Chrome storage quota. Flushing excess data`);
            chrome.storage[namespace].clear().then(() => console.log(`Excess data flushed`));
            extension.createNotification('storageQuotaExceeded');
        };
    });
});
//Command listener
chrome.commands.onCommand.addListener((command,tab) => {
    console.log(`Command ${command} triggered`);
    switch(command){
        case "call-letters":
            fetch("https://script.google.com/macros/s/AKfycbyOsqxSw_xOF1sHf1yJTGcKl_F0Y4Zc6ff5NT2f6Y4/dev?sheetId=1Dx68oDce47PvQhwlxPUh2iqYxnCu9PFUzJh7RKFk-t0&cl=true")
            .then(response => response.json())
            .then(callLetterData => {
                chrome.scripting.executeScript({target:{tabId:tab.id},func:extension.getCallLetters,args:[callLetterData]})
                .then(injectionResult => console.log(injectionResult));
            })
        break;
        case "market-numbers":
            fetch("https://script.google.com/macros/s/AKfycbyOsqxSw_xOF1sHf1yJTGcKl_F0Y4Zc6ff5NT2f6Y4/dev?sheetId=1Dx68oDce47PvQhwlxPUh2iqYxnCu9PFUzJh7RKFk-t0")
            .then(response => response.json())
            .then(marketNumberData => {
                chrome.scripting.executeScript({target:{tabId:tab.id},func:extension.getMarketNumbers,args:[marketNumberData]})
                .then(injectionResult => console.log(injectionResult));
            })
        break;
    }
});
//Suspend listener
chrome.runtime.onSuspend.addListener(() => {
    console.log(`onSuspend triggered`);
    extension.stopExports();
});
//SuspendCanceled
chrome.runtime.onSuspendCanceled.addListener(() => {
    console.log(`onSuspendCanceled triggered`);
    extension.stopExports();
});