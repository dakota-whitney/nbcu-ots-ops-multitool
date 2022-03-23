chrome.storage.local.get('otsAppMetadata')
.then(storageObject => {
    const appleId = window.location.href.split("/").find(path => path.match(/^\d+$/));
    if(storageObject.otsAppMetadata[appleId]){
        console.clear();
        console.group('Ops Multitool');
        console.log(`Apple ID: ${appleId}`);
        const marketData = storageObject.otsAppMetadata[appleId];
        console.log(`This market's metadata:`);
        console.log(marketData.storeChanges);
        console.log('App Store Connect URLs:');
        for(const [marketId,storeData] of Object.entries(storageObject.otsAppMetadata)) marketId !== appleId ? console.log(`${storeData.market}\n${storeData.storeUrl}`) : undefined;
        const selectorMetadataMap = {
            "div[name='promotionalText']": "Promotional Text",
            "div[name='whatsNew']": "What's New  in This Version",
            "div[name='description']": "Description",
            "input[name='keywords']": "Keywords",
            "input[name='supportUrl']": "Support URL",
            "input[name='versionString']": "Version",
            "input[name='versionString'].has-meta": "Version",
            "#name":"Name",
            "#subtitle":"Subtitle",
        };
        const autofillAppleStore = () => {
            for(let [inputElement,metadata] of Object.entries(selectorMetadataMap)){
                inputElement = document.querySelector(inputElement);
                metadata = marketData["storeChanges"][metadata];
                if(inputElement && !inputElement.disabled && metadata){
                    inputElement.dispatchEvent(new InputEvent('input'));
                    inputElement.value = metadata;
                    inputElement.innerText = metadata;
                    inputElement.style.color = '#3c0997';
                    inputElement.style.border = '2px solid #3c0997';
                }else console.warn(`Failed to autofill \nElement: ${inputElement}\nMetadata: ${metadata}`)
            };
            document.querySelector("button.select-builds-button___1E97t") ? document.querySelector("button.select-builds-button___1E97t").click() : undefined;
        };
        const handleMutation = mutationList => {
            mutationList.forEach(mutationRecord => {
                if(mutationRecord.target.querySelector("div.ReactVirtualized__Table__row.selectable")){
                    const versionBuild = Array.from(document.querySelectorAll("div.ReactVirtualized__Table__row.selectable")).find(build => build.children[2].innerText == marketData["storeChanges"]["Version"]);
                    if(versionBuild) versionBuild.click();
                    const doneButton = Array.from(document.querySelectorAll("div.ReactModalPortal")).find(modal => modal.innerText.includes("Add Build")).querySelector("button[type='primary']");
                    if(doneButton){
                        doneButton.click();
                        observer.disconnect();
                    };
                };
                if(mutationRecord.target.querySelector("input[name='versionString'].has-meta")) autofillAppleStore();
            });
        };
        const observer = new MutationObserver(handleMutation);
        observer.observe(document.querySelector("body"),{childList:true,subtree:true});
        chrome.runtime.onMessage.addListener((message,sender,sendResponse) => {
            switch(message.command){
                case "autofill":
                    autofillAppleStore();
                break;
            };
        });
        console.groupEnd();
    }else{throw new Error(`Could not retrieve object with ID ${appleId} from Chrome storage`)};
})
.catch(error => new Error(error.message));