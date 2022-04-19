//UI Functions
const toggleLoading = target => {
    target.classList.toggle("hidden");
    if(!document.getElementById('loading-img')){
        const loading = document.createElement("img");
        loading.src = `img/spinner.gif`;
        loading.id = 'loading-img';
        target.insertAdjacentElement("afterend",loading);
    }else document.getElementById('loading-img').remove();
};
export const showButtonGrid = e => {
    const fieldset = e.target.parentElement;
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
//Wordpress functions
export const showDomainsList = async e => {
    let {otsDomains} = await chrome.runtime.sendMessage({request:'domains'});
    otsDomains = otsDomains.map(domain => domain.split(".")[0]);
    for(const domain of otsDomains) document.getElementById("domains-list").innerHTML += `<option id="${domain}" value="${domain}" class="domain-option">${domain}</option>`;
    document.querySelectorAll('.domain-option').forEach(option => option.onclick = compareSettings)
    document.querySelectorAll("button.tools").forEach(button => button.classList.toggle('hidden'));
    document.querySelectorAll('.domains').forEach(domainElement => domainElement.classList.toggle('hidden'));
};
const compareSettings = async e => {
    const [baseTab] = await chrome.tabs.query({active:true,currentWindow:true});
    let {value:compareUrl} = e.target;
    compareUrl = baseTab.url.replace(/(nbc|telemundo)\w+.com/,`${compareUrl}.com`);
    const compareTab = await chrome.tabs.create({url:compareUrl,active:false});
    chrome.storage.local.set({compareTabs:[baseTab.id,compareTab.id]});
};
export const backupSettings = async currentTabId => {
    let [{result:settings}] = await chrome.scripting.executeScript({target:{tabId:currentTabId},files:['./content_scripts/get-settings.js']});
    if(!settings) return alert('Could not get settings from the current page');
    settings = JSON.stringify(settings,['setting','value'],2);
    console.log(settings);
    const settingsBlob = new Blob([settings],{type:'text/plain'});
    chrome.downloads.download({url:URL.createObjectURL(settingsBlob),saveAs:true});
};
//VIP CLI Functions
export const getCliCommand = async (currentTabId,command) => {
    const [{result:commandString}] = await chrome.scripting.executeScript({target:{tabId:currentTabId},func:getCommandString,args:[command]});
    return commandString ? prompt("Run the command below in your terminal:",commandString) : alert("Command not available");
};
//Content script
const getCommandString = command => {
    console.log(`getCommandString injected successfully`);
    const domain = window.location.hostname;
    let [environment] = domain.split(".");
    environment = environment.match(/ots|www/) ? "production" : environment = environment === "uat" ? "preprod" : environment = environment === "dev" ? "develop" : environment === "stage" ? "stage" : environment;
    console.log(domain);
    switch(command){
        case "clear-post-cache":
            const postId = window.location.search ? window.location.search.match(/(?<=post=)\d+/)[0] : window.location.href.split("/").find(path => path.match(/^\d+$/));
            return postId ? `vip @nbcots.${environment} wp -y -- --url=${domain} nbc purge_post_cache ${postId}` : "";
        case "clear-homepage-cache":
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
        default:
            return "";
    };
};
//App Release Functions
export const toggleAppStatus = fetchButton => {
    fetchButton.classList.toggle('fetched');
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
export const fetchAppMetadata = e => {
    const sheetId = prompt("App Metadata Sheet ID:");
    if(!sheetId) return;
    toggleLoading(e.target);
    fetch(`https://script.google.com/macros/s/AKfycbyOsqxSw_xOF1sHf1yJTGcKl_F0Y4Zc6ff5NT2f6Y4/dev?sheetId=${sheetId}`)
    .then(async response => {
        const otsAppMetadata = await response.json();
        await chrome.storage.local.set({otsAppMetadata:otsAppMetadata});
        console.log(`App Data stored as:\n${JSON.stringify(otsAppMetadata)}`);
        toggleLoading(e.target);
        const [currentTab] = await chrome.tabs.query({active:true,currentWindow:true})
        await chrome.scripting.executeScript({target:{tabId:currentTab.id},func:logAppMetadata,args:[otsAppMetadata]});
        alert(`App release metadata has been successfully fetched. See browser console to inspect.`);
        toggleAppStatus(e.target);
    })
    .catch(error => {
        alert(`There was an unexpected error retrieving the app metadata. See extension log for more details`);
        throw new Error(error.message);
    });
};
const flushAppMetadata = async e => {
    await chrome.storage.local.remove('otsAppMetadata')
    console.log(`Removed otsAppMetadata from Chrome storage`);
    alert(`Successfully flushed app store metadata`);
    toggleAppStatus(e.target);
};
//Content script
export const logAppMetadata = metadataObject => {
    const headingStyle = 'text-decoration:underline;font-weight:bolder;padding:5px;background-color:#3c0997;color:white;';
    console.group(`%cOps Multitool:`,headingStyle);
    console.log(`%cApp store metadata for this version:`,headingStyle);
    console.log(metadataObject);
    console.log(`%cSee below for the App Store URLs:`,headingStyle)
    for(const [marketId,marketData] of Object.entries(metadataObject)){
        console.log(`%c${marketData.market}`,headingStyle);
        console.log(marketData.storeUrl);
    };
    console.groupEnd();
};
//CCPA Functions
export const toggleExportStatus = exportButton => {
    exportButton.classList.toggle('exporting');
    if(exportButton.classList.contains('exporting')){
        exportButton.innerText = 'Stop Exports';
        exportButton.onclick = stopExports;
    }else{
        exportButton.innerText = 'Fetch Data Exports';
        exportButton.onclick = startExports;
    };
};
export const startExports = e => {
    if(confirm(`Please verify you are logged in to NBCU SSO before launching export sites`)){
        chrome.runtime.sendMessage({request:'start-exports'}).then(response => console.log(`Extension is: ${response.status}`))
        toggleExportStatus(e.target);
    };
};
export const stopExports = async e => {
    const response = await chrome.runtime.sendMessage({request:'stop-exports'});
    alert(response.status);
    toggleExportStatus(e.target);
};
export const writeDsrBatch = async (currentTabId,requestType) => {
    requestType = requestType.split['-'][1];
    console.log(`Request Type: ${requestType}`);
    const [{result:exportResults}] = await chrome.scripting.executeScript({target:{tabId:currentTabId},func:getDsrBatch,args:[requestType]})
    console.log(exportResults);
    if(typeof exportResults == "string") return alert(exportResults);
    const dsrPayload = {
        method:'POST',
        headers:{'Content-Type': 'application/json'},
        body:JSON.stringify(exportResults),
    };
    fetch(`https://script.google.com/macros/s/AKfycbyOsqxSw_xOF1sHf1yJTGcKl_F0Y4Zc6ff5NT2f6Y4/dev?sheetId=1tinuzD17oNfzgLUHt5nZGTli-rbR_mo6k9oertDGlNw&requestType=${requestType}`,dsrPayload)
    .then(async response => {
        const requestorEmails = await response.json();
        console.log(requestorEmails);
        console.log(`Stage 3 Users on this page: ${requestorEmails.join(" ")}`);
        prompt("Run the following command to create data exports for these DSRs",`for email in ${requestorEmails.join(" ")};do vip @nbcots.production wp -y -- nbc export_user_personal_data --type=export --email="$email";done`);
    });
};
//Content script
const getDsrBatch = requestType => {
    const dsrBatch = new Array;
    const dataLabels = ['ID','Name','Email','Stage','Days Left','Extended','Date Created'];
    if(!document.querySelector("td[data-label='Email']")) return 'Please add Email column to DSR queue';
    let i = 0;
    for(const dsr of document.querySelectorAll("tr[scope='row']")){
        if(requestType === "delete" && !dsr.querySelector("td[data-label='Request Type']").innerText.match(/delete/i)){
            return `Please add the following filter to your DSR Queue:\nRequest Type: Delete Information`;
        }
        if(requestType === "access" && !dsr.querySelector("td[data-label='Request Type']").innerText.match(/access/i)){
            return `Please add the following filter to your DSR Queue:\nRequest Type: Access Information`;
        };
        if(!dsr.querySelector("td[data-label='Stage']").innerText.match(/3/)){
            return 'Please add the following filter to your DSR Queue:\nStage: 3.) GATHER INFORMATION';
        };
        dsrBatch[i] = new Array;
        for(const dataLabel of dataLabels){
            let dsrData;
            if(dataLabel == 'ID'){
                const dsrId = dsr.querySelector(`td[data-label='${dataLabel}']`).innerText;
                const dsrUrl = dsr.querySelector(`td[data-label='${dataLabel}']`).querySelector("a[ot-auto-id]").href;
                dsrData = [dsrId,dsrUrl]
            }else{
                dsrData = dsr.querySelector(`td[data-label='${dataLabel}']`).innerText;
            }
            dsrBatch[i] = typeof dsrData === "object" ? [...dsrBatch[i],...dsrData] : [...dsrBatch[i],dsrData];
        };
        i++;
    };
    return dsrBatch;
};