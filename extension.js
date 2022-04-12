export const createNotification = notificationId => {
    const notifications = {
        storageQuotaExceeded: {
            type:"basic",
            iconUrl:"/img/extension.png",
            title:`Chrome Storage Alert`,
            message:`Bytes used by this extension exceeded the Chrome storage quota for this namespace. Excess data has been flushed`
        },
        ccpaDownloadsComplete: {
            type:"basic",
            iconUrl:"/img/multitool.png",
            title:`CCPA Notification`,
            message:`Wordpress exports have completed downloading`
        }
    };
    chrome.notifications.create(notificationId,notifications[notificationId],notificationId => {
        console.log(`Notification ${notificationId} was created`);
        setTimeout(() => chrome.notifications.clear(notificationId,wasCleared => console.log(`Notification ${notificationId} ${wasCleared ? 'was' : 'was not'} cleared`)),5000)
    });
};
export const openExportWindow = async pageIndex => {
    chrome.contentSettings.automaticDownloads.set({primaryPattern:`https://*/*`,setting:'allow'});
    chrome.power.requestKeepAwake('system');
    const exportWindow = await chrome.windows.create({state:'minimized',url:`https://stage.${otsDomains[pageIndex]}/wp-admin/export-personal-data.php`});
    chrome.storage.local.set({exportWindow:exportWindow.id,exportPageRequestCount:0})
};
export const stopExports = async () => {
    const {exportWindow} = await chrome.storage.local.get('exportWindow');
    chrome.windows.remove(exportWindow).catch(error => console.log(error.message));
    const {exportPageIndex} = await chrome.storage.local.get('exportPageIndex');
    const currentMarketExports = await chrome.downloads.search({query:['wp-personal-data-file'],orderBy:["startTime"],urlRegex:otsDomains[exportPageIndex]})
    if(currentMarketExports.length > 0){
        currentMarketExports.forEach(async (dataExport,i) => {
            await chrome.downloads.removeFile(dataExport.id)
            await chrome.downloads.erase({id:dataExport.id});
            if(i === currentMarketExports.length - 1) chrome.downloads.search({query:['wp-personal-data-file']}).then(totalExports => chrome.action.setBadgeText({text:`${totalExports.length}`}))
        });
    }else chrome.downloads.search({query:['wp-personal-data-file']}).then(totalExports => totalExports.length > 0 ? chrome.action.setBadgeText({text:`${totalExports.length}`}) : chrome.action.setBadgeText({text:""}));
    chrome.storage.local.remove(['exportPageRequestCount','exportWindow']);
    chrome.contentSettings.automaticDownloads.clear({});
    chrome.power.releaseKeepAwake();
};
export const openNextExportTab = async currentExportPage => {
    console.log(`Current export page: ${currentExportPage.url}`);
    chrome.downloads.search({query:['wp-personal-data-file','(',')'],state:"complete"})
    .then(duplicateExports => duplicateExports.forEach(duplicate => chrome.downloads.removeFile(duplicate.id).then(() => chrome.downloads.erase({id:duplicate.id}))));
    let {exportPageIndex} = await chrome.storage.local.get('exportPageIndex')
    console.log(`exportPageIndex: ${exportPageIndex}`);
    exportPageIndex++;
    chrome.storage.local.set({exportPageIndex:exportPageIndex})
    if(exportPageIndex <= otsDomains.length - 1){
        const nextExportPage = `https://stage.${otsDomains[exportPageIndex]}/wp-admin/export-personal-data.php`;
        console.log(`Next export page: ${nextExportPage}`);
        await chrome.tabs.create({windowId:currentExportPage.windowId,url:nextExportPage});
        chrome.tabs.remove(currentExportPage.id);
    }else{
        console.log(`Exports complete.\nResetting extension export settings`);
        await chrome.windows.remove(currentExportPage.windowId)
        stopExports();
        chrome.storage.local.remove('exportPageIndex');
        chrome.action.setBadgeText({text:''});
        createNotification('ccpaDownloadsComplete');
    };
};
export const getCallLetters = callLetterObject => {
    let input = new String;
    let output = new String;
    do{
        input = window.prompt(`Get Call Letters:`).trim().toLowerCase();
        output = `Invalid market input: ${input}`;
        if(input.length >= 3){
            if(input.match(/^[A-Z]{3,4}(\/[A-Z]{3,4})?$/i) && !input.match(/utah|dfw|san|new|l[oa]s|bay|el/)){
                Object.keys(callLetterObject).forEach(callLetters => {
                    callLetters.toLowerCase().includes(input) ? output = callLetterObject[callLetters] : console.log(`Input "${input}" does not match ${callLetters}`)
                });
            }else{
                let duopoloy = "";
                for(let [callLetters,market] of Object.entries(callLetterObject)){
                    if(market.toLowerCase().includes(input)){
                        output = duopoloy ? `${duopoloy.match(/nbc/i) ? "NBC" : "Telemundo"}: ${output}\n${market.split(" ")[0]}: ${callLetters}` : callLetters;
                        duopoloy = market;
                    };
                };
            };
        };
        window.alert(output);
    }while(input && output.includes("Invalid"));
    return output;
};
export const getMarketNumbers = marketNumberObject => {
    let input = new String;
    let output = new String;
    do{
        input = window.prompt(`Get Market Letters:`).trim();
        if(input.match(/\d{1,2}$/)){ //Number search
            input = input.match(/\d{1,2}$/)[0];
            for(let [market,marketNumbers] of Object.entries(marketNumberObject)){
                if(typeof marketNumbers === "object"){
                    for(let brand in marketNumbers){
                        marketNumbers[brand].split(" ")[1] == input ? output = output.concat(`${marketNumbers[brand].split(" ")[0]} ${market}\n`) : undefined;
                    };
                }else{
                    marketNumbers.split(" ")[1] == input ? output = output.concat(`${marketNumbers.split(" ")[0]} ${market}\n`) : undefined
                };
            };
        }else if(input.length >= 3){
            input = input.toLowerCase();
            for(let [market,marketNumbers] of Object.entries(marketNumberObject)){
                if(market.toLowerCase().includes(input)){
                    if(typeof marketNumbers === "object"){
                        for(let brand in marketNumbers){output = output.concat(`${marketNumbers[brand]}\n`)};
                    }else{
                        output = marketNumbers;
                    };
                };
            };
        };
        window.alert(output);
    }while(input !== "" && output === "")
    return output;
};
export const otsDomains = [
    "nbcnewyork.com",
    "nbcbayarea.com",
    "nbcboston.com",
    "nbcchicago.com",
    "nbcconnecticut.com",
    "nbcdfw.com",
    "nbclosangeles.com",
    "nbcmiami.com",
    "necn.com",
    "nbcphiladelphia.com",
    "nbcsandiego.com",
    "nbcwashington.com",
    "telemundoareadelabahia.com",
    "telemundochicago.com",
    "telemundodallas.com",
    "telemundodenver.com",
    "telemundo48elpaso.com",
    "telemundohouston.com",
    "telemundo52.com",
    "telemundolasvegas.com",
    "telemundo40.com",
    "telemundo51.com",
    "telemundo47.com",
    "telemundonuevainglaterra.com",
    "telemundo31.com",
    "telemundo62.com",
    "telemundoarizona.com",
    "telemundopr.com",
    "telemundosanantonio.com",
    "telemundo20.com",
    "telemundo49.com",
    "telemundowashingtondc.com",
    "telemundoutah.com",
    "telemundo33.com",
    "telemundofresno.com",
    "lx.com",
    "cleartheshelters.com",
    "desocuparlosalbergues.com",
    "cozitv.com",
    "telexitos.com",
    "telemundonuevomexico.com",
];