import * as popup from './popup.js';
fetch("https://automatticstatus.com/rss")
.then(response => response.text())
.then(xmlString => new DOMParser().parseFromString(xmlString,"text/xml"))
.then(statusNodes => {
    const vipStatus = document.getElementById("vip-status");
    let isUp = true;
    Array.from(statusNodes.getElementsByTagName("title")).forEach(title => {
        title = title.textContent;
        title.includes("Outage") || title.includes("Degraded") ? isUp = false : undefined;
    });
    isUp ? vipStatus.setAttribute("style","color:lightgreen;") : vipStatus.setAttribute("style","color:red;");
    vipStatus.innerText = isUp ? "Good" : "Alert";
})
.catch(error => {
    document.getElementById("vip-status").setAttribute("style","color:red;");
    document.getElementById("vip-status").innerText = `ERROR`;
    throw new Error(error.message);
});
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
document.querySelectorAll('.grid-heading').forEach(gridHeading => gridHeading.addEventListener('click',popup.showButtonGrid));
chrome.tabs.query({active:true,currentWindow:true})
.then(async tabs => {
    const [currentTab] = tabs;
    const marketRegex = /(www|ots|uat|stage|dev)?\.(nbc|telemundo|lx|cleartheshelters|cozitv)\w+\d*\.com/;
    if(currentTab.url.match(marketRegex))document.querySelectorAll('.cli-btn').forEach(cliButton => cliButton.addEventListener('click',e => popup.getCliCommand(currentTab.id,e.target.id)));
    else{
        document.querySelectorAll('.cli-btn').forEach(cliButton => cliButton.disabled = true);
        document.getElementById("compare-settings").disabled = true;
    };
    const storageObject = await chrome.storage.local.get(null)
    const fetchExportButton = document.getElementById("fetch-data-exports");
    fetchExportButton.onclick = popup.startExports;
    if(storageObject.hasOwnProperty('exportWindow')) popup.toggleExportStatus(fetchExportButton);
    document.querySelectorAll(".export-btn").forEach(exportBtn => {
        if(currentTab.url === "https://app.onetrust.com/dsar/queue") exportBtn.addEventListener('click',e => popup.writeDsrBatch(currentTab.id,e.target.id))
        else exportBtn.disabled = true;
    });
    const fetchMetadataButton = document.getElementById("fetch-app-metadata");
    fetchMetadataButton.onclick = popup.fetchAppMetadata;
    if(storageObject.hasOwnProperty('otsAppMetadata')) popup.toggleAppStatus(fetchMetadataButton);
    if(currentTab.url.match(/https:\/\/appstoreconnect\.apple\.com\/apps\/\d+\/appstore/)){
        document.getElementById('autofill-metadata').addEventListener('click',() => chrome.tabs.sendMessage(currentTab.id,{command:'autofill'}).then(response => console.log(`From App Store page: ${response.status}`)));
    };
    document.getElementById('flush-ots-cache').addEventListener('click',e => popup.requestFlushCache(currentTab.url,e.target.id));
});