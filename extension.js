export const createNotification = notificationId => {
    const notifications = {
        appReleaseComplete: {
            type:"basic",
            iconUrl:"/img/multitool.png",
            title:`App Release Notification`,
            message:`App release process has completed. Please verify data and submit releases`
        },
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
    "www.nbcnewyork.com",
    //"ots.nbcwpshield.com/telemundo",
    "www.nbcbayarea.com",
    "www.nbcboston.com",
    "www.nbcchicago.com",
    "www.nbcconnecticut.com",
    "www.nbcdfw.com",
    "www.nbclosangeles.com",
    "www.nbcmiami.com",
    "www.necn.com",
    "www.nbcphiladelphia.com",
    "www.nbcsandiego.com",
    "www.nbcwashington.com",
    "www.telemundoareadelabahia.com",
    "www.telemundochicago.com",
    "www.telemundodallas.com",
    "www.telemundodenver.com",
    "www.telemundo48elpaso.com",
    "www.telemundohouston.com",
    "www.telemundo52.com",
    "www.telemundolasvegas.com",
    "www.telemundo40.com",
    "www.telemundo51.com",
    "www.telemundo47.com",
    "www.telemundonuevainglaterra.com",
    "www.telemundo31.com",
    "www.telemundo62.com",
    "www.telemundoarizona.com",
    "www.telemundopr.com",
    "www.telemundosanantonio.com",
    "www.telemundo20.com",
    "www.telemundo49.com",
    "www.telemundowashingtondc.com",
    "www.telemundoutah.com",
    "www.telemundo33.com",
    "www.telemundofresno.com",
    //"ots.nbcwpshield.com/qa",
    "www.lx.com",
    "www.cleartheshelters.com",
    "www.desocuparlosalbergues.com",
    "www.cozitv.com",
    "www.telexitos.com",
    "www.telemundonuevomexico.com",
];