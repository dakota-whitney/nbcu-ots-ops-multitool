import * as popup from './popup.js';
fetch("https://automatticstatus.com/rss")
.then(async response => {
    const xmlString = await response.text();
    const statusNodes = new DOMParser().parseFromString(xmlString,"text/xml");
    let outage = false;
    Array.from(statusNodes.getElementsByTagName("title")).forEach(title => {
        title = title.textContent;
        if(title.includes("Outage") || title.includes("Degraded")) outage = true
    });
    const vipStatus = document.getElementById("vip-status");
    vipStatus.setAttribute("style","color:lightgreen;");
    vipStatus.innerText = "Good";
    if(outage){
        vipStatus.setAttribute("style","color:red;");
        vipStatus.innerText = "Alert";
    };
})
.catch(error => {
    const vipStatus = document.getElementById("vip-status");
    vipStatus.setAttribute("style","color:red;");
    vipStatus.innerText = `ERROR`;
    throw new Error(error.message);
});
fetch("https://theplatform.service-now.com/support_portal/")
.then(async response => {
    const htmlString = await response.text();
    const domObject = new DOMParser().parseFromString(htmlString,"text/html");
    const cvpStatusDisplay = document.getElementById("cvp-status");
    cvpStatusDisplay.setAttribute("style","color:yellow;")
    cvpStatusDisplay.innerText = "Login";
    const cvpStatus = domObject.querySelector(".status-container");
    if(!cvpStatus) return
    cvpStatusDisplay.setAttribute("style","color:lightgreen;")
    cvpStatusDisplay.innerText = "Good";
    if(!cvpStatus.innerText.includes("Normal")){
        console.log(`CVP Status: ${cvpStatus.innerText}`);
        cvpStatusDisplay.setAttribute("style","color:red;")
        cvpStatusDisplay.innerText = "Alert";
    };
})
.catch(error => {
    const cvpStatus = document.getElementById("cvp-status");
    cvpStatus.setAttribute("style","color:red;");
    cvpStatus.innerText = `ERROR`;
    throw new Error(error.message);
});
document.getElementById('extension-version').innerText = `Version ${chrome.runtime.getManifest().version}`;
document.querySelectorAll('.grid-heading').forEach(gridHeading => gridHeading.addEventListener('click',popup.showButtonGrid));
chrome.tabs.query({active:true,currentWindow:true})
.then(async tabs => {
    const [currentTab] = tabs;
    const marketRegex = /(www|ots|uat|stage|dev)?\.(nbc|telemundo|lx|cleartheshelters|cozitv)\w+\d*\.com/;
    if(currentTab.url.match(marketRegex)){
        document.querySelectorAll('.cli-btn').forEach(cliButton => {
            cliButton.disabled = false;
            cliButton.addEventListener('click',e => popup.getCliCommand(currentTab.id,e.target.id))
        });
    };
    document.getElementById("compare-settings").addEventListener('click',() => popup.compareSettings(currentTab));
    document.getElementById("backup-settings").addEventListener('click',() => popup.backupSettings(currentTab))
    const storageObject = await chrome.storage.local.get(null)
    const fetchExportButton = document.getElementById("fetch-data-exports");
    fetchExportButton.onclick = popup.startExports;
    if(storageObject.exportWindow) popup.toggleExportStatus(fetchExportButton);
    document.querySelectorAll(".export-btn").forEach(exportBtn => {
        if(currentTab.url === "https://app.onetrust.com/dsar/queue") exportBtn.addEventListener('click',e => popup.writeDsrBatch(currentTab.id,e.target.id))
        else exportBtn.disabled = true;
    });
    const fetchMetadataButton = document.getElementById("fetch-app-metadata");
    fetchMetadataButton.onclick = popup.fetchAppMetadata;
    if(storageObject.otsAppMetadata) popup.toggleAppStatus(fetchMetadataButton);
    if(currentTab.url.match(/https:\/\/appstoreconnect\.apple\.com\/apps\/\d+\/appstore/)){
        document.getElementById('autofill-metadata').addEventListener('click',() => chrome.tabs.sendMessage(currentTab.id,{command:'autofill'}).then(response => console.log(`From App Store page: ${response.status}`)));
    };
});