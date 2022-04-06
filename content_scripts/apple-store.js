(async () => {
    const autofillAppleStore = () => {
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
        console.clear();
        console.group('Ops Multitool');
        console.log(`This market's metadata:`);
        console.log(marketData);
        for(let [elementString,dataKey] of Object.entries(selectorMetadataMap)){
            const inputElement = document.querySelector(elementString);
            const {[dataKey]:metadata} = marketData.storeChanges;
            if(inputElement && !inputElement.disabled && metadata){
                inputElement.dispatchEvent(new InputEvent('input'));
                inputElement.value = metadata;
                inputElement.innerText = metadata;
                inputElement.style.color = '#3c0997';
                inputElement.style.border = '2px solid #3c0997';
            }else console.log(`Failed to autofill \nElement: ${elementString}\nMetadata: ${metadata}`)
        };
        const selectBuildsBtn = document.querySelector("button.select-builds-button___1E97t");
        if(selectBuildsBtn) selectBuildsBtn.click();
        console.log('App Store Connect URLs:');
        for(const [marketId,storeData] of Object.entries(otsAppMetadata)) console.log(`${storeData.market}\n${storeData.storeUrl}`);
        console.groupEnd();
    };
    const handleSelectBuilds = mutationList => {
        mutationList.forEach(mutationRecord => {
            if(mutationRecord.target.querySelector("div.ReactVirtualized__Table__row.selectable")){
                const {["Version"]:newVersion} = marketData.storeChanges;
                const versionBuild = Array.from(document.querySelectorAll("div.ReactVirtualized__Table__row.selectable")).find(build => build.children[2].innerText == newVersion);
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
    const appleId = window.location.href.split("/").find(path => path.match(/^\d+$/));
    console.log(`Apple ID: ${appleId}`);
    const {otsAppMetadata} = await chrome.storage.local.get('otsAppMetadata');
    const {[appleId]:marketData} = otsAppMetadata;
    const observer = new MutationObserver(handleSelectBuilds);
    observer.observe(document.querySelector("body"),{childList:true,subtree:true});
    chrome.runtime.onMessage.addListener((message,sender,sendResponse) => {
        autofillAppleStore();
        sendResponse({status:`Autofilled app store metadata`});
    })
})();