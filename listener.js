import * as extension from './extension.js';
//Tabs updated listener
chrome.tabs.onUpdated.addListener(async (tabId,changeInfo) => {
    const changedTab = await chrome.tabs.get(tabId);
    console.log(`Tab ${changedTab.id} has been updated %o`,changeInfo);
    const {status} = changeInfo;
    if(!status) return
    const storage = await chrome.storage.local.get(null);
    if(storage.exportWindow && changeInfo.url && changedTab.windowId == storage.exportWindow){
        if(changeInfo.url.match(/(?<=(inbcu\.com\/)|(wp-))login/)) chrome.scripting.executeScript({target:{tabId:tabId},func:() => alert('Please log in to SSO to continue downloads')});
        else if(changeInfo.url.match(/\/wp-content\//)) extension.reloadExportTab(tabId);
    }
    if(storage.compareTabs && tabId === storage.compareTabs[1] && status === "complete"){
        const [{result:compareSettings}] = await chrome.scripting.executeScript({target:{tabId:tabId},files:['./content_scripts/get-settings.js']});
        await chrome.scripting.executeScript({target:{tabId:storage.compareTabs[0]},func:extension.compareElements,args:[compareSettings]});
    };
});
//Window closed listener
chrome.windows.onRemoved.addListener(async (windowId) => {
    const {exportWindow} = await chrome.storage.local.get('exportWindow');
    if(exportWindow && windowId == exportWindow) chrome.storage.local.remove('exportWindow');
});
//Message listener
chrome.runtime.onMessage.addListener(async (message,sender,sendResponse) => {
    console.log(`listener.js received ${message.request} request`)
    switch(message.request){
        case "start-exports":
            sendResponse({status:'starting exports'})
            const {pageIndex} = message;
            const totalExports = await chrome.downloads.search({query:['wp-personal-data-file']});
            if(pageIndex > 0) chrome.action.setBadgeText({text:`${totalExports.length}`});
            else{
                totalExports.forEach(dataExport => {
                    chrome.downloads.removeFile(dataExport.id)
                    .then(() => chrome.downloads.erase({id:dataExport.id}).catch(error => console.log(error.message)))
                    .catch(error => console.error(error.message));
                });
                chrome.action.setBadgeText({text:'0'});
            };
            extension.openExportWindow(pageIndex);
        break;
        case "stop-exports":
            extension.stopExports();
            sendResponse({status:`Data Requests have stopped downloading. Any exports already downloaded will remain in your downloads folder`})
        break;
        case "domains":
            sendResponse({otsDomains:extension.otsDomains});
        break;
    };
    return true; //Required if using async code above
});
chrome.downloads.onDeterminingFilename.addListener(async (download,suggest) => {
    console.log(`Download ${download.id} detected: %o`,download);
    if(download.filename.match('wp-personal-data-file')){
        suggest();
        const {exportPageRequestCount} = await chrome.storage.local.get('exportPageRequestCount');
        if(!exportPageRequestCount || download.filename.match(/\(\d\).zip$/)) return;
        let completedExports = await chrome.downloads.search({query:["wp-personal-data-file"]});
        completedExports.length >= 1000 ? chrome.action.setBadgeText({text:`${(completedExports.length / 1000).toString().substring(0,3)}k`}) : chrome.action.setBadgeText({text:`${completedExports.length}`});
        completedExports = completedExports.filter(dataExport => dataExport.referrer == download.referrer);
        console.log(`Completed exports for market ${download.referrer.split("/")[2]}: ${completedExports.length} / ${exportPageRequestCount}`)
        const [currentExportTab] = await chrome.tabs.query({url:download.referrer});
        if(completedExports.length >= exportPageRequestCount) extension.openNextExportTab(currentExportTab)
        else{
            let requestor = download.filename.split("-");
            requestor = requestor.slice(4,requestor.findIndex(elem => elem == "at"))[0].replaceAll(/\W/g,"").toLowerCase();
            chrome.tabs.sendMessage(currentExportTab.id,{command:'remove-request',requestor:requestor})
            .then(response => console.log(`%c${response.status}`,'color:yellow;font-style:italic'))
            .catch(error => extension.stopExports(error.message));
        };
    };
    return true;
});
//Download changed listener
chrome.downloads.onChanged.addListener(async (downloadDelta) => {
    const {id,state} = downloadDelta;
    console.log(`Download ${id} changed: %o`,downloadDelta);
    const {exportWindow} = await chrome.storage.local.get('exportWindow');
    if(exportWindow && state && state.current === "complete"){
        const dataExport = await chrome.downloads.search({id:id});
        if(dataExport.filename.match(/\(\d+\).zip$/)) chrome.downloads.removeFile(id).then(() => chromw.downloads.erase({id:id}))
    };
});
//Download Erased Listener
chrome.downloads.onErased.addListener(download => console.log(`${download.filename} erased`));
//Storage listener
chrome.storage.onChanged.addListener(async (changes,namespace) => {
    for(const [key,{oldValue,newValue}] of Object.entries(changes)){
        const stringSubs = {"object":"%o","string":"%s","number":"%d"};
        console.log(`Storage key "${key}" in the "${namespace}" namespace has changed:\nOld value was: ${stringSubs[typeof oldValue]}\nNew value is: ${stringSubs[typeof newValue]}`,oldValue,newValue)
    };
    const bytesInUse = await chrome.storage[namespace].getBytesInUse(null);
    console.log(`Total bytes currently in use for the ${namespace} namespace: ${bytesInUse} / ${chrome.storage[namespace].QUOTA_BYTES}`)
    if(bytesInUse >= chrome.storage[namespace].QUOTA_BYTES){
        console.error(`Bytes used by this extension exceeded the Chrome storage quota. Flushing excess data`);
        await chrome.storage[namespace].clear();
        console.log(`Excess data flushed`);
        extension.createNotification('storageQuotaExceeded');
    };
});
//Command listener
chrome.commands.onCommand.addListener(async (command,tab) => {
    console.log(`Command ${command} triggered`);
    switch(command){
        case "call-letters":
            fetch("https://script.google.com/macros/s/AKfycbyOsqxSw_xOF1sHf1yJTGcKl_F0Y4Zc6ff5NT2f6Y4/dev?sheetId=1Dx68oDce47PvQhwlxPUh2iqYxnCu9PFUzJh7RKFk-t0&cl=true")
            .then(async response => {
                const callLetterData = await response.json();
                chrome.scripting.executeScript({target:{tabId:tab.id},func:extension.getCallLetters,args:[callLetterData]})
            })
        break;
        case "market-numbers":
            fetch("https://script.google.com/macros/s/AKfycbyOsqxSw_xOF1sHf1yJTGcKl_F0Y4Zc6ff5NT2f6Y4/dev?sheetId=1Dx68oDce47PvQhwlxPUh2iqYxnCu9PFUzJh7RKFk-t0")
            .then(async response => {
                const marketNumberData =  await response.json();
                chrome.scripting.executeScript({target:{tabId:tab.id},func:extension.getMarketNumbers,args:[marketNumberData]})
            })
        break;
    }
});
//Suspend listener
chrome.runtime.onSuspend.addListener(() => {
    console.log(`onSuspend triggered`);
    chrome.storage.local.remove(['exportPageRequestCount','compareTabs']);
});
//SuspendCanceled
chrome.runtime.onSuspendCanceled.addListener(() => {
    console.log(`onSuspendCanceled triggered`);
    chrome.storage.local.remove(['exportPageRequestCount','compareTabs']);
});