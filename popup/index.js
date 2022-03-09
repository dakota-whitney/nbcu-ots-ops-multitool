import * as popup from './popup.js';
fetch("https://automatticstatus.com/rss")
    .then(response => response.text())
    .then(xmlString => new DOMParser().parseFromString(xmlString,"text/xml"))
    .then(statusNodes => {
        Array.from(statusNodes.getElementsByTagName("title")).forEach(titleNode => {
            let statusTitle = titleNode.textContent;
            console.log(statusTitle)
            if(statusTitle.includes("Outage") || statusTitle.includes("Degraded")){
                return false;
            };
        });
        return true;
    })
    .then(isUp => {
        let vipStatus = document.getElementById("vip-status");
        if(isUp){
            vipStatus.setAttribute("style","color:lightgreen;");
        }else{
            vipStatus.setAttribute("style","color:red;");
        };
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
        let cvpStatus = document.getElementById("cvp-status");
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
document.querySelectorAll('.grid-heading').forEach(gridHeading => {
    gridHeading.addEventListener('click',event => popup.showButtonGrid(event.target.id));
});
document.querySelectorAll('.cli-btn').forEach(cliButton => {
    cliButton.addEventListener('click',() => {
        popup.getCliCommand(cliButton.id);
    });
});
document.getElementById("autofill-app-btn").addEventListener('click',event => {
    if(window.confirm('Please verify that you are logged in to the corresponding app store for this release')){
        const sheetId = window.prompt("Sheet ID:");
        if(sheetId){
            popup.setLoading(event.target.id);
            fetch(`https://script.google.com/macros/s/AKfycbyOsqxSw_xOF1sHf1yJTGcKl_F0Y4Zc6ff5NT2f6Y4/dev?sheetId=${sheetId}`)
            .then(response => response.json())
            .then(appData => {
                console.log(`App Data retrieved as:`);
                console.log(appData);
                if(popup.verifyAppData(appData)){
                    chrome.runtime.sendMessage({request:`app-release`,appData:appData},() => popup.setLoading(event.target.id,false));
                };
            })
            .catch(error => {
                window.alert(`There was an unexpected error retrieving the app metadata. See extension log for more details`);
                throw new Error(error.message);
            });
        };
    };
});
document.querySelectorAll(".export-btn").forEach(exportBtn => {
    exportBtn.addEventListener('click',event => {
        const requestType = event.target.id.split("-")[1];
        console.log(`Request Type: ${requestType}`);
        chrome.tabs.query({active:true,currentWindow:true})
        .then(tabs => {
            chrome.scripting.executeScript({target:{tabId:tabs[0].id},func:popup.getDsrBatch,args:[requestType]})
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
            .catch(error => {
                console.log(error.message);
            })
        });
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