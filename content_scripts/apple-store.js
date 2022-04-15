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
        const headingStyle = 'text-decoration:underline;font-weight:bolder;padding:5px;background-color:#3c0997;color:white;';
        console.clear();
        console.group('%cOps Multitool',headingStyle);
        console.log(`%cThis market's metadata:`,headingStyle);
        console.log(marketData);
        for(let [elementString,dataKey] of Object.entries(selectorMetadataMap)){
            const inputElement = document.querySelector(elementString);
            const {[dataKey]:metadata} = marketData.storeChanges;
            if(inputElement && !inputElement.disabled && metadata){
                inputElement.dispatchEvent(new InputEvent('input'));
                inputElement.value = metadata;
                inputElement.innerText = metadata;
                inputElement.style = `color:#3c0997;border:2px solid #3c0997`;
            }else console.log(`%cFailed to autofill \nElement: ${elementString}\nMetadata: ${metadata}`,'color:yellow;font-style:italic;')
        };
        const selectBuildsBtn = document.querySelector("button.select-builds-button___1E97t");
        if(selectBuildsBtn) selectBuildsBtn.click();
        console.log('%cApp Store Connect URLs:',headingStyle);
        for(const [marketId,storeData] of Object.entries(otsAppMetadata)){
            console.log(`%c${storeData.market}`,headingStyle);
            console.log(storeData.storeUrl);
        };
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
    const appleId = location.pathname.split("/").find(path => path.match(/^\d+$/));
    console.log(`Apple ID: ${appleId}`);
    const {otsAppMetadata} = await chrome.storage.local.get('otsAppMetadata');
    if(!otsAppMetadata) return;
    const {[appleId]:marketData} = otsAppMetadata;
    if(!marketData) return;
    const observer = new MutationObserver(handleSelectBuilds);
    observer.observe(document.querySelector("body"),{childList:true,subtree:true});
    chrome.runtime.onMessage.addListener((message,sender,sendResponse) => {
        autofillAppleStore();
        sendResponse({status:`Autofilled app store metadata`});
    });
})();