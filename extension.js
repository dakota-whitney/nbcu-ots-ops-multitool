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
export const stopExports = errorMessage => {
    chrome.storage.local.remove(['exportPageRequestCount','exportPageIndex']).then(() => chrome.runtime.sendMessage({toggleExportStatus:true}))
    chrome.contentSettings.automaticDownloads.clear({});
    chrome.power.releaseKeepAwake();
    if(errorMessage) throw new Error(errorMessage);
};
export const openNextExportTab = async currentExportPage => {
    console.log(`Current export page: ${currentExportPage.url}`);
    let {exportPageIndex} = await chrome.storage.local.get('exportPageIndex')
    console.log(`exportPageIndex: ${exportPageIndex}`);
    exportPageIndex++;
    chrome.storage.local.set({exportPageIndex:exportPageIndex})
    if(otsDomains[exportPageIndex]){
        const nextExportPage = `https://${otsDomains[exportPageIndex]}/wp-admin/export-personal-data.php`;
        console.log(`Next export page: ${nextExportPage}`);
        chrome.tabs.create({windowId:currentExportPage.windowId,url:nextExportPage}).then(() => chrome.tabs.remove(currentExportPage.id))
    }else{
        console.log(`Exports complete.\nResetting extension export settings`);
        chrome.windows.remove(currentExportPage.windowId)
        .then(() => {
            stopExports();
            createNotification('ccpaDownloadsComplete');
        });
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
    "stage.nbcnewyork.com",
    //"ots.nbcwpshield.com/telemundo",
    "stage.nbcbayarea.com",
    "stage.nbcboston.com",
    "stage.nbcchicago.com",
    "stage.nbcconnecticut.com",
    "stage.nbcdfw.com",
    "stage.nbclosangeles.com",
    "stage.nbcmiami.com",
    "stage.necn.com",
    "stage.nbcphiladelphia.com",
    "stage.nbcsandiego.com",
    "stage.nbcwashington.com",
    "stage.telemundoareadelabahia.com",
    "stage.telemundochicago.com",
    "stage.telemundodallas.com",
    "stage.telemundodenver.com",
    "stage.telemundo48elpaso.com",
    "stage.telemundohouston.com",
    "stage.telemundo52.com",
    "stage.telemundolasvegas.com",
    "stage.telemundo40.com",
    "stage.telemundo51.com",
    "stage.telemundo47.com",
    "stage.telemundonuevainglaterra.com",
    "stage.telemundo31.com",
    "stage.telemundo62.com",
    "stage.telemundoarizona.com",
    "stage.telemundopr.com",
    "stage.telemundosanantonio.com",
    "stage.telemundo20.com",
    "stage.telemundo49.com",
    "stage.telemundowashingtondc.com",
    "stage.telemundoutah.com",
    "stage.telemundo33.com",
    "stage.telemundofresno.com",
    //"ots.nbcwpshield.com/qa",
    "stage.lx.com",
    "stage.cleartheshelters.com",
    "stage.desocuparlosalbergues.com",
    "stage.cozitv.com",
    "stage.telexitos.com",
    "stage.telemundonuevomexico.com",
];