export const setLoading = (elementId,isLoading = true) => {
    if(document.getElementById(elementId)){
        let target = document.getElementById(elementId);
        if(isLoading){
            let loading = document.createElement("img");
            loading.src = `img/spinner.gif`;
            loading.id = 'loading-img';
            target.insertAdjacentElement("afterend",loading);
            target.classList.toggle("hidden");
        }else{
            document.getElementById('loading-img') ?
                document.getElementById('loading-img').remove() :
                console.log(`Could not identify existing element with id #loading-img`)
                target.classList.toggle("hidden");
        };
    }else{
        throw new Error(`Could not identify an existing element with id ${elementId}`)
    };
};
export const showButtonGrid = legendId => {
    const fieldset = document.getElementById(legendId).parentElement;
    const btnGrid = fieldset.querySelector(`.btn-grid`);
    const legend = document.getElementById(legendId);
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
export const verifyAppData = appDataObject => {
    const newVersion = Object.values(appDataObject).find(value => value.appVersion).appVersion;
    const platform = Object.values(appDataObject).find(value => value.platform).platform;
    if(window.confirm(`Would you like to create a new ${platform} release for app version ${newVersion}`)){
        //Verify further data in this loop
        for(const [marketId,marketData] of Object.entries(appDataObject)){
            if(newVersion !== marketData.appVersion){
                return window.alert(`Mismatching version number found in sheet: ${marketData.appName}: ${marketData.appVersion}\nPlease review the app metadata sheet and try again`)
            };
        };
        return true;
    };
};
export const getCliCommand = buttonId => {
    let command = buttonId.split("-");
    command = command.slice(0,command.length - 1).join("-");
    chrome.tabs.query({active:true,currentWindow:true}).then(tabs =>
        chrome.scripting.executeScript({target:{tabId:tabs[0].id},func:getCommandString,args:[command]},commandString => {
            commandString = commandString[0].result ? commandString[0].result : `Command not available`;
            commandString.includes("vip") ? window.prompt(`Run the command below in your terminal:`,commandString) : window.alert(commandString);
            return commandString;
        })
    ).catch(error => new Error(error.message));
};
//Content scripts
export const getCommandString = command => {
    console.log(`getCommandString injected successfully`);
    const domain = window.location.href.split("/")[2];
    let environment = domain.split(".")[0];
    environment = environment.match(/ots|www/) ? "production" : environment = environment === "uat" ? "preprod" : environment = environment === "dev" ? "develop" : environment;
    console.log(domain);
    const marketRegex = /(www|ots|uat|stage|dev)?\.(nbc|telemundo|lx|cleartheshelters|cozitv)\w+\d*\.com/;
    if(domain.match(marketRegex) || window.location.href === "https://app.onetrust.com/dsar/queue"){
        let postId = new String;
        switch(command){
            case "clear-cache":
                postId = window.location.href.match(/\d{7}/)[0];
                return postId ? `vip @nbcots.${environment} wp -y -- --url=${domain} nbc purge_post_cache ${postId}` : "";
            case "clear-hp-cache":
                return domain.match(marketRegex) ? `vip @nbcots.${environment} wp nbc flush_homepage_cache -- --url=${domain}` : "";
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
};
export const getDsrBatch = requestType => {
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