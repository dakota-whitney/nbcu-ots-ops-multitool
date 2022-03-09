import * as extension from './extension.js';
//Message listener
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch(message.request){
        case "app-release":
            if(sender.tab){
                console.log(`Autofill complete message recieved from tab ${sender.tab.id}`);
                sendResponse({});
                chrome.storage.local.remove(message.marketKey)
                .then(() => {
                    chrome.storage.local.get(null)
                    .then(storage => {
                        const storeUrls = Object.values(storage).filter(value => value.storeUrl).map(marketData => marketData.storeUrl);
                        if(storeUrls.length > 0){
                            chrome.tabs.create({windowId:sender.tab.windowId,url:storeUrls[0]}).then(tab => console.log(`Tab ${tab.id} created`));
                        }else{
                            extension.createNotification('appReleaseComplete');
                        };
                    });
                });
            };
            if(message.appData){
                let marketObject = new Object;
                const firstId = Object.keys(message.appData)[0];
                marketObject[firstId] = message.appData[firstId];
                console.log(marketObject[firstId].storeUrl);
                chrome.storage.local.set(marketObject).then(() => chrome.windows.create({url:message.appData[firstId].storeUrl}).then(() => sendResponse()))
                for(const [marketId,marketData] of Object.entries(message.appData)){
                    if(typeof marketData === "object"){
                        marketObject = new Object;
                        marketObject[marketId] = marketData;
                        chrome.storage.local.set(marketObject).then(() => console.log(`${marketObject} stored`));
                    };
                };
            };
        break;
        case "export-personal-data":
            const exportPages = extension.otsDomains.map(domain => `https://${domain}/wp-admin/export-personal-data.php`);
            const currentExportPage = sender.tab ? exportPages.findIndex(exportPage => sender.tab.url.includes(exportPage)) : 0;
            console.log(`Current export page: ${exportPages[currentExportPage]}`)
            if(message.startDownloads){
                chrome.storage.local.set({exportStatus:'running'}).then(() => console.log(`Set export status to 'running'`));
                chrome.downloads.erase({query:['wp-personal-data-file']},erasedIds => {
                    console.log(`${erasedIds} erased`);
                    console.log(exportPages);
                    chrome.windows.create({url:exportPages[currentExportPage]}).then(window => console.log(`New window ${window.id} opened`));
                });
            }
            if(message.requestCount){
                const requestCount = message.requestCount;
                const domain = sender.tab.url.split("/")[2];
                sendResponse({status:'counting exports'});
                chrome.downloads.search({query:["wp-personal-data-file"],urlRegex:domain,orderBy:["-startTime"],limit:requestCount},downloads => {
                    console.log(`Exports found : ${downloads.length}`);
                    const exportMessage = new Object;
                    if(downloads.length < requestCount){
                        exportMessage.command = 'get-remaining-exports';
                    }else{
                        exportMessage.command = 'downloads-complete';
                        downloads.forEach(download => chrome.downloads.erase({id:download.id},() => console.log(`Export ${download.id} erased from history`)));
                    };
                    chrome.tabs.sendMessage(sender.tab.id,exportMessage,response => console.log(response.status));
                });
            };
            if(message.downloadsComplete){
                console.log(`Received downloads complete message`);
                if(exportPages[currentExportPage + 1]){
                    chrome.tabs.create({windowId:sender.tab.windowId,url:exportPages[currentExportPage + 1]},() => chrome.tabs.remove(sender.tab.id));
                }else{
                    chrome.tabs.remove(sender.tab.id,() => {
                        chrome.contentSettings.automaticDownloads.clear({});
                        chrome.storage.local.remove('exportStatus');
                        chrome.power.releaseKeepAwake();
                        extension.createNotification('ccpaDownloadsComplete')
                    });
                };
            };
        break;
    };
    return true; //Required if using async code above
});
//Download listener
chrome.downloads.onChanged.addListener(downloadDelta => {
    console.log(`Download with ID ${downloadDelta.id} has changed`);
    console.log(downloadDelta);
    if(downloadDelta.state.current === 'complete'){
        console.log(`Download ${downloadDelta.id} has completed downloading`);
        setTimeout(() => chrome.downloads.search({id:downloadDelta.id},download => {
            console.log(download);
            let fileName = download[0].filename.split("/");
            fileName = fileName[fileName.length - 1]
            if(fileName.includes("wp-personal-data-file")){
                chrome.tabs.query({url:download[0].referrer},tabs => {
                    console.log(`Export page found: ${tabs[0].id}`)
                    chrome.tabs.sendMessage(tabs[0].id,{command:'remove-request',fileName:fileName},response => {
                        console.log(`From export page: ${response.status}`);
                    });
                });
                if(fileName.match(/\(\d\).zip$/)){
                    chrome.downloads.removeFile(download[0].id,() => {
                        console.log(`${fileName} removed from disk`);
                        chrome.downloads.erase({id:download[0].id},() => console.log(`${fileName} removed from Chrome history`))
                    });
                };
            };
        }),1000);
    };
});
//Tab listener
chrome.tabs.onUpdated.addListener((tabId,changeInfo,tab) => {
    //Listen for URL changes (errors) on the export pages
    chrome.storage.local.get('exportStatus',storageObject => {
        if(storageObject.exportStatus){
            if(tab.url.includes("wp-personal-data-file")){
                let exportUrl = extension.otsDomains.find(domain => domain.match(tab.url.split("/")[2]));
                exportUrl = `https://${exportUrl}/wp-admin/export-personal-data.php`
                chrome.tabs.create({windowId:tab.windowId,url:exportUrl},() => chrome.tabs.remove(tabId))
            };
            if(tab.url.match(/(inbcu.com\/login)|(\/wp-login.php\?)/)){
                chrome.scripting.executeScript({target:{tabId:tabId},func:() => window.alert('You are not logged in to NBCU SSO. Please login to continue')})
            };
        };
    });
 });
//Suspend listener
chrome.runtime.onSuspend.addListener(() => {
    console.log(`onSuspend triggered`);
    chrome.storage.local.clear({});
    chrome.contentSettings.automaticDownloads.clear({});
});
//SuspendCanceled
chrome.runtime.onSuspendCanceled.addListener(() => {
    console.log(`onSuspendCanceled triggered`);
    chrome.storage.local.clear({});
    chrome.contentSettings.automaticDownloads.clear({});
})
//Storage listener
chrome.storage.onChanged.addListener((changes,namespace) => {
    for(let [key,{oldValue,newValue}] of Object.entries(changes)){
        console.log(`Storage key "${key}" in the "${namespace}" namespace has changed.`);
        console.log(`Old value was:`);
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