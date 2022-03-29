//UI Functions
const setLoading = (target,isLoading = true) => {
    if(isLoading){
        let loading = document.createElement("img");
        loading.src = `img/spinner.gif`;
        loading.id = 'loading-img';
        target.insertAdjacentElement("afterend",loading);
        target.classList.toggle("hidden");
    }else{
        document.getElementById('loading-img') ? document.getElementById('loading-img').remove() : console.log(`Could not identify existing element with id #loading-img`);
        target.classList.toggle("hidden");
    };
};
export const showButtonGrid = legendId => {
    const fieldset = document.getElementById(legendId).parentElement;
    const btnGrid = fieldset.querySelector(`.btn-grid`);
    //If grid is already hidden
    if(btnGrid.classList.contains("hidden")){
        document.querySelectorAll(".btn-grid").forEach(grid => {
            !grid.classList.contains("hidden") ? grid.classList.toggle("hidden") : undefined;
        });
        document.querySelectorAll("fieldset").forEach(fieldset => {
            !fieldset.classList.contains("no-border") ? fieldset.classList.toggle("no-border") : undefined;
        });
        fieldset.classList.toggle("no-border");
        btnGrid.classList.toggle("hidden");
    }else{
        fieldset.classList.toggle("no-border");
        btnGrid.classList.toggle("hidden");
    };
};
//VIP CLI Functions
export const getCliCommand = (command,currentTabId) => {
    chrome.scripting.executeScript({target:{tabId:currentTabId},func:getCommandString,args:[command]},commandString => {
        commandString = commandString[0].result ? commandString[0].result : `Command not available`;
        commandString.includes("vip") ? window.prompt(`Run the command below in your terminal:`,commandString) : undefined;
        return commandString;
    });
};
const getCommandString = command => {
    console.log(`getCommandString injected successfully`);
    const domain = window.location.href.split("/")[2];
    let environment = domain.split(".")[0];
    environment = environment.match(/ots|www/) ? "production" : environment = environment === "uat" ? "preprod" : environment = environment === "dev" ? "develop" : environment === "stage" ? "stage" : environment;
    console.log(domain);
    let postId = new String;
    switch(command){
        case "clear-cache":
            postId = window.location.href.match(/\d{7}/)[0];
            return postId ? `vip @nbcots.${environment} wp -y -- --url=${domain} nbc purge_post_cache ${postId}` : "";
        case "clear-hp-cache":
            return `vip @nbcots.${environment} wp nbc flush_homepage_cache -- --url=${domain}`;
        case "trigger-syndication":
            if(window.location.href.match(/&action=edit/)){
                let originatingPostId = Array.from(document.querySelectorAll("a.components-button")).find(link => link.innerText.includes("Originating"));
                if(originatingPostId){
                    originatingPostId = originatingPostId.href.match(/(?<=post=)\d+/)[0];
                    return `vip @nbcots.${environment} wp -y -- --url=${domain} --user=feed-consumer@nbc.local nbc trigger_syndication ${originatingPostId}`;
                };
            };
        break;
    };
};
//App Release Functions
export const toggleAppDataStatus = fetchButton => {
    if(fetchButton.classList.contains('fetched')){
        fetchButton.innerText = 'Flush App Store Metadata';
        fetchButton.onclick = flushAppMetadata;
        fetchButton.nextElementSibling.disabled = false;
    }else{
        fetchButton.innerText = 'Fetch App Store Metadata';
        fetchButton.onclick = fetchAppMetadata;
        fetchButton.nextElementSibling.disabled = true;
    };
};
const fetchAppMetadata = e => {
    const sheetId = window.prompt("App Metadata Sheet ID:");
    if(sheetId){
        setLoading(e.target);
        fetch(`https://script.google.com/macros/s/AKfycbyOsqxSw_xOF1sHf1yJTGcKl_F0Y4Zc6ff5NT2f6Y4/dev?sheetId=${sheetId}`)
        .then(response => response.json())
        .then(metadataObject => {
            const otsAppMetadata = {otsAppMetadata:metadataObject};
            chrome.storage.local.set(otsAppMetadata).then(() => {
                console.log(`App Data stored as:\n${JSON.stringify(otsAppMetadata)}`);
                setLoading(e.target,false);
                chrome.tabs.query({active:true,currentWindow:true}).then(tabs => {
                    chrome.scripting.executeScript({target:{tabId:tabs[0].id},func:logAppMetadata,args:[metadataObject]}).then(() => {
                        window.alert(`App release metadata has been successfully fetched. See browser console to inspect.`);
                        e.target.classList.toggle('fetched');
                        toggleAppDataStatus(e.target);
                    });
                })
            });
        })
        .catch(error => {
            window.alert(`There was an unexpected error retrieving the app metadata. See extension log for more details`);
            throw new Error(error.message);
        });
    };
};
const flushAppMetadata = e => {
    setLoading(e.target);
    chrome.storage.local.remove('otsAppMetadata').then(() => {
        setLoading(e.target,false);
        console.log(`Removed otsAppMetadata from Chrome storage`);
        window.alert(`Successfully flushed app store metadata`);
        e.target.classList.toggle('fetched');
        toggleAppDataStatus(e.target);
    });
};
export const logAppMetadata = metadataObject => {
    console.group(`Ops Multitool:`);
    console.log(`App store metadata for this version:`);
    console.log(metadataObject);
    console.log(`See below for the App Store URLs:`)
    for(const [marketId,marketData] of Object.entries(metadataObject)){
        console.log(`${marketData.market}: ${marketData.storeUrl}\n`);
    };
    console.groupEnd();
};
//CCPA Functions
export const toggleExportStatus = exportButton => {
    if(exportButton.classList.contains('exporting')){
        exportButton.innerText = 'Stop Exports';
        exportButton.onclick = stopExports;
    }else{
        exportButton.innerText = 'Fetch Data Exports';
        exportButton.onclick = startExports;
    };
};
const startExports = e => {
    if(window.confirm(`Please verify you are logged in to NBCU SSO before launching export sites`)){
        chrome.runtime.sendMessage({request:'start-exports'})
        e.target.classList.toggle('exporting');
        toggleExportStatus(e.target);
    };
};
export const stopExports = e => {
    chrome.runtime.sendMessage({request:'stop-exports'})
    e.target.classList.toggle('exporting');
    toggleExportStatus(e.target);
};
export const ccpaExportPII = (requestType,currentTabId) => {
    console.log(`Request Type: ${requestType}`);
    chrome.scripting.executeScript({target:{tabId:currentTabId},func:getDsrBatch,args:[requestType]})
    .then(exportResults => {
        exportResults = exportResults[0].result;
        console.log(exportResults);
        if(typeof exportResults === "object"){
            fetch(`https://script.google.com/macros/s/AKfycbyOsqxSw_xOF1sHf1yJTGcKl_F0Y4Zc6ff5NT2f6Y4/dev?sheetId=1tinuzD17oNfzgLUHt5nZGTli-rbR_mo6k9oertDGlNw&requestType=${requestType}`,{
                method:'POST',
                headers:{'Content-Type': 'application/json'},
                body:JSON.stringify(exportResults),
            })
            .then(response => response.json())
            .then(requestorEmails => {
                console.log(requestorEmails);
                console.log(`Stage 3 Users on this page: ${requestorEmails.join(" ")}`);
                window.prompt("Run the following command to create data exports for these DSRs",`for email in ${requestorEmails.join(" ")};do vip @nbcots.production wp -y -- nbc export_user_personal_data --type=export --email="$email";done`);
            });
        }else{
            window.alert(exportResults);
        };
    })
    .catch(error => new Error(error.message))
};
const getDsrBatch = requestType => {
    const dsrBatch = new Array;
    let filterError = "";
    if(window.location.href === "https://app.onetrust.com/dsar/queue"){
        if(document.querySelector("td[data-label='Email']")){
            document.querySelectorAll("tr[scope='row']").forEach((dsr,i) => {
            if(requestType === "delete" && !dsr.querySelector("td[data-label='Request Type']").innerText.match(/delete/i)){
                filterError = `Please add the following filter to your DSR Queue:\nRequest Type: Delete Information`;
            }
            if(requestType === "access" && !dsr.querySelector("td[data-label='Request Type']").innerText.match(/access/i)){
                filterError = `Please add the following filter to your DSR Queue:\nRequest Type: Access Information`;
            };
            if(!dsr.querySelector("td[data-label='Stage']").innerText.match(/3/)){
                filterError = 'Please add the following filter to your DSR Queue:\nStage: 3.) GATHER INFORMATION';
            };
            if(!filterError){
                dsrBatch[i] = new Array;
                dsrBatch[i].push(dsr.querySelector("td[data-label='ID']").innerText);
                dsrBatch[i].push(dsr.querySelector("td[data-label='ID']").querySelector("a[ot-auto-id]").href);
                dsrBatch[i].push(dsr.querySelector("td[data-label='Name']").innerText);
                dsrBatch[i].push(dsr.querySelector("td[data-label='Email']").innerText);
                dsrBatch[i].push(dsr.querySelector("td[data-label='Stage']").innerText[0]);
                dsrBatch[i].push(dsr.querySelector("td[data-label='Days Left']").innerText);
                dsrBatch[i].push(dsr.querySelector("td[data-label='Extended']").innerText);
                dsrBatch[i].push(dsr.querySelector("td[data-label='Date Created']").innerText);
            };
        });
    }else{
        filterError = 'Please add Email column to DSR queue';
    };
    }else{
        filterError = 'Not a valid URL for this action';
    }
    return filterError ? filterError : dsrBatch;
};