import * as popup from './popup.js';
fetch("https://automatticstatus.com/rss")
    .then(response => response.text())
    .then(xmlString => new DOMParser().parseFromString(xmlString,"text/xml"))
    .then(statusNodes => {
        let isUp = true;
        Array.from(statusNodes.getElementsByTagName("title")).forEach(title => {
            title = title.textContent;
            title.includes("Outage") || title.includes("Degraded") ? isUp = false : undefined;
        });
        return isUp;
    })
    .then(isUp => {
        const vipStatus = document.getElementById("vip-status");
        isUp ? vipStatus.setAttribute("style","color:lightgreen;") : vipStatus.setAttribute("style","color:red;");
        vipStatus.innerText = isUp ? "Good" : "Alert";
    })
    .catch(error => {
        document.getElementById("vip-status").setAttribute("style","color:red;");
        document.getElementById("vip-status").innerText = `ERROR`;
        throw new Error(error.message);
})
fetch("https://theplatform.service-now.com/support_portal/")
    .then(response => response.text())
    .then(htmlString => new DOMParser().parseFromString(htmlString,"text/html"))
    .then(domObject => {
        console.log(domObject.title);
        const cvpStatus = document.getElementById("cvp-status");
        if(domObject.title.includes("Login")){
            cvpStatus.setAttribute("style","color:yellow;")
            cvpStatus.innerText = "Login";
        };
        if(domObject.querySelector(".status-container")){
            if(domObject.querySelector(".status-container").innerText.includes("Normal")){
                cvpStatus.setAttribute("style","color:lightgreen;")
                cvpStatus.innerText = "Good";
            }else{
                console.log(domObject.querySelector(".status-container").innerText)
                cvpStatus.setAttribute("style","color:red;")
                cvpStatus.innerText = "Alert";
            };
        };
    })
    .catch(error => {
        document.getElementById("cvp-status").setAttribute("style","color:red;");
        document.getElementById("cvp-status").innerText = `ERROR`;
        throw new Error(error.message);
});
document.getElementById('extension-version').innerText = `Version ${chrome.runtime.getManifest().version}`;
document.querySelectorAll('.grid-heading').forEach(gridHeading => gridHeading.addEventListener('click',event => popup.showButtonGrid(event.target.id)));
chrome.tabs.query({active:true,currentWindow:true})
.then(tabs => {
    const currentTab = tabs[0];
    document.querySelectorAll('.cli-btn').forEach(cliButton => {
        if(currentTab.url.match(/(www|ots|uat|stage|dev)?\.(nbc|telemundo|lx|cleartheshelters|cozitv)\w+\d*\.com/)){
            let command = cliButton.id.split("-");
            command = command.slice(0,command.length - 1).join("-");
            cliButton.addEventListener('click',() => popup.getCliCommand(command,currentTab.id));
        }else{
            cliButton.disabled = true;
        };
    });
    document.querySelectorAll(".export-btn").forEach(exportBtn => {
        if(currentTab.url === "https://app.onetrust.com/dsar/queue"){
            const requestType = exportBtn.id.split['-'][1];
            exportBtn.addEventListener('click',() => popup.ccpaExportPII(requestType,currentTab.id))
        }else{
            exportBtn.disabled = true;
        };
    });
    chrome.storage.local.get('otsAppMetadata').then(storageObject => {
        const ingestButton = document.getElementById("ingest-app-metadata-btn");
        if(!storageObject.otsAppMetadata){
            popup.toggleIngested(ingestButton);
        }else{
            ingestButton.classList.toggle('ingested');
            popup.toggleIngested(ingestButton);
        };
    });
});
document.getElementById("fetch-exports-btn").addEventListener('click',event => {
    if(window.confirm(`Please verify you are logged in to NBCU SSO before launching export sites`)){
        chrome.contentSettings.automaticDownloads.set({primaryPattern:`https://*/*`,setting:'allow'},() => {
            chrome.power.requestKeepAwake('system');
            chrome.runtime.sendMessage({request:`export-personal-data`,startDownloads:true});
        });
    };
});