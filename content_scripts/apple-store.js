(() => {
    const hasLoaded = selector => new Promise((resolve,reject) => {
        let queries = 0;
        const intervalId = setInterval(() => {
            //Queries the DOM every second for 2 minutes
            if(document.querySelector(selector)){
                clearInterval(intervalId);
                resolve(document.querySelector(selector));
            };
            queries++;
            if(queries >= 240){
                clearInterval(intervalId);
                reject(`Could not identify element with selector ${selector}`);
            };
            console.log(`Scanned for element with selector ${selector} ${queries} time(s)`);
        },500)
    });
    console.log('Content Script injected successfully');
    const appleId = window.location.href.split("/").find(path => path.match(/^\d+$/));
    chrome.storage.local.get(appleId)
    .then(marketObject => {
        if(marketObject[appleId]){
            const marketData = marketObject[appleId];
            console.log(`This market's object:`);
            console.log(marketData);
            chrome.runtime.sendMessage({request:`app-release`,marketKey:appleId},() => {
                (async () => {
                    console.log(`Begin autofill`);
                    //Add version

                    const addVersion = await hasLoaded('#IOS_app_versions-add-button');
                    setTimeout(() => addVersion.click(),1000);
                    const versionInput = await hasLoaded('input#versionString.has-meta');
                    const createButton = await hasLoaded('button[data-id="create-new-version"]');
                    versionInput.value = marketData["changes"]["Version"];
                    createButton.classList.remove('tb-btn--disabled');

                    /*Autofill data
                    //const inputEvent = new InputEvent('input');
                    const promotionalText = await hasLoaded('div[name="promotionalText"]');
                    promotionalText.innerText = `Promotional text here`;
                    promotionalText.value = `Promotional text here`;
                    //promotionalText.innerText = marketData["changes"]["Promotional Text"];
                    const whatsNew = await hasLoaded('div[name="whatsNew"]');
                    whatsNew.innerText = `What's new here`;
                    whatsNew.value = `What's new here`;
                    const description = await hasLoaded('div[name="description"]');
                    description.innerText = 'Description here';
                    description.value = `Description here`;
                    description.innerText = marketData["changes"]["Description"];
                    description.value = marketData["changes"]["Description"];
                    description.dispatchEvent(inputEvent);
                    const keywords = await hasLoaded('input[name="keywords"]');
                    keywords.value = `Keywords here`;
                    /*keywords.value = marketData["changes"]["Keywords"];
                    keywords.dispatchEvent(inputEvent);
                    const supportUrl = await hasLoaded('input[name="supportUrl"]');
                    supportUrl.value = marketData["changes"]["Support URL"] ? marketData["changes"]["Support URL"] : "";
                    //supportUrl.dispatchEvent(inputEvent);
                    const versionInput = await hasLoaded('input[name="versionString"]');
                    versionInput.value = marketData["changes"]["Version"] ? marketData["changes"]["Version"] : "";
                    /*const manualRelease = await hasLoaded('#manualRelease');
                    manualRelease.click();
                    const saveButton = await hasLoaded("#heading-buttons > button");
                    saveButton.click();*/
                })();
            });
        }else{
            throw new Error(`Could not retrieve object with ID ${appleId} from Chrome storage`);
        };
    })
    .catch(error => new Error(error.message));
})();