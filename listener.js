import * as extension from './extension.js';
//Message listener
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch(message.request){
        case "export-personal-data":
            const exportPages = extension.otsDomains.map(domain => `https://${domain}/wp-admin/export-personal-data.php`);
            const currentExportPage = sender.tab ? exportPages.findIndex(exportPage => exportPage == sender.tab.url) : -1;
            console.log(`Current export page: ${exportPages[currentExportPage]}`)
            if(message.startDownloads){
                chrome.downloads.erase({query:['wp-personal-data-file']},() => {
                    chrome.windows.create({url:exportPages[0]}).then(window => {
                        console.log(`New window ${window.id} opened`);
                        chrome.storage.local.set({exportWindow:window.id});
                    });
                });
            };
            if(message.requestCount){
                const domain = sender.tab.url.split("/")[2];
                chrome.downloads.search({query:["wp-personal-data-file"],urlRegex:domain,orderBy:["-startTime"],limit:message.requestCount},downloads => {
                    console.log(`Exports found: ${downloads.length}`);
                    sendResponse({status:`Exports found: ${downloads.length}`});
                    const exportMessage = new Object;
                    downloads.length < message.requestCount ? exportMessage.command = 'get-remaining-exports' : exportMessage.command = 'downloads-complete';
                    chrome.tabs.sendMessage(sender.tab.id,exportMessage,response => console.log(response.status));
                });
            };
            if(message.downloadsComplete){
                console.log(`Received downloads complete message from export page`);
                if(currentExportPage !== -1){
                    if(exportPages[currentExportPage + 1]){
                        console.log(`Opening next export page: ${exportPages[currentExportPage + 1]}`);
                        chrome.tabs.create({windowId:sender.tab.windowId,url:exportPages[currentExportPage + 1]},() => chrome.tabs.remove(sender.tab.id));
                    }else{
                        console.log(`Last export page ${exportPages[currentExportPage]} has finished downloading exports\nResetting extension export settings`)
                        chrome.tabs.remove(sender.tab.id,() => {
                            chrome.contentSettings.automaticDownloads.clear({});
                            chrome.storage.local.remove('exportWindow');
                            chrome.power.releaseKeepAwake();
                            chrome.downloads.erase({query:['wp-personal-data-file']});
                            extension.createNotification('ccpaDownloadsComplete');
                        });
                    };
                }else throw new Error(`Could not identify export page ${currentExportPage}`);
            };
        break;
    };
    return true; //Required if using async code above
});
//Download listener
chrome.downloads.onDeterminingFilename.addListener((download,suggest) => {
    console.log(`Download detected:`);
    console.log(download);
    if(download.filename.match('wp-personal-data-file')){
        suggest();
        chrome.storage.local.get('exportWindow',storageObject => {
            if(storageObject.exportWindow){
                if(download.filename.match(/\(\d\).zip$/)){
                    chrome.downloads.removeFile(download.id,() => {
                        console.log(`${download.filename} removed from disk`);
                        chrome.downloads.erase({id:download.id},() => console.log(`${download.filename} removed from Chrome history`))
                    });
                }else{
                    chrome.downloads.search({query:["wp-personal-data-file"]},downloads => chrome.action.setBadgeText({text:`${downloads.length}`}));
                    let requestor = download.filename.split("-");
                    requestor = requestor.slice(4,requestor.findIndex(elem => elem == "at"))[0].replaceAll(/\W/g,"").toLowerCase();
                    chrome.tabs.query({url:download.referrer},tabs => {
                        console.log(`Export page found: ${tabs[0].id}\nSending remove-request to export page`);
                        chrome.tabs.sendMessage(tabs[0].id,{command:'remove-request',requestor:requestor},response => console.log(response.status));
                    });
                };
            };
        });
    };
    return true;
});
//Download Erased Listener
chrome.downloads.onErased.addListener((download) => {
    console.log(`${download.filename} erased`);
    chrome.storage.local.get('exportWindow').then(storageObject => {
        if(storageObject.exportWindow){
            chrome.downloads.search({query:["wp-personal-data-file"]},downloads => chrome.action.setBadgeText({text:`${downloads.length}`}));
        };
    });
});
//Tab listener
chrome.tabs.onUpdated.addListener((tabId,changeInfo,tab) => {
    //Listen for URL changes (errors) on the export pages
    chrome.storage.local.get('exportWindow',storageObject => {
        if(storageObject.exportWindow){
            console.log('Tab Change Info:');
            console.log(changeInfo);
            if(tab.url.includes("wp-personal-data-file")){
                let exportUrl = extension.otsDomains.find(domain => domain.match(tab.url.split("/")[2]));
                exportUrl = `https://${exportUrl}/wp-admin/export-personal-data.php`;
                chrome.tabs.create({windowId:tab.windowId,url:exportUrl},() => chrome.tabs.remove(tabId));
            };
            /*if(tab.url.match(/(inbcu.com\/login)|(\/wp-login.php\?)/)){
                chrome.scripting.executeScript({target:{tabId:tabId},func:() => window.alert('You are not logged in to NBCU SSO. Please login to continue')})
            };*/
        };
    });
 });
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
    chrome.storage.local.remove('exportWindow');
    chrome.power.releaseKeepAwake();
    chrome.contentSettings.automaticDownloads.clear({});
    chrome.action.setBadgeText({text:""});
});
//SuspendCanceled
chrome.runtime.onSuspendCanceled.addListener(() => {
    console.log(`onSuspendCanceled triggered`);
    chrome.storage.local.remove('exportWindow');
    chrome.power.releaseKeepAwake();
    chrome.contentSettings.automaticDownloads.clear({});
    chrome.action.setBadgeText({text:""});
});