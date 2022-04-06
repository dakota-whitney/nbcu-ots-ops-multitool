(async () => {
    let {exportPageRequestCount} = await chrome.storage.local.get('exportPageRequestCount');
    console.log(`Content script injected successfully`);
    const downloadExports = dataRequests => {
        if(dataRequests.length > 0){
            dataRequests.forEach((request,i) => {
                setTimeout(() => request.querySelector('button.export-personal-data-handle').click(),i * 2000);
                if(i === dataRequests.length - 1) downloadsDoneObserver.observe(request,{attributes:true,attributeFilter:["class"]});
            });
        }else console.error(dataRequests,'downloadExports was called on an empty user list')
    };
    const handleDownloadsDone = mutationList => {
        mutationList.forEach(mutationRecord => {
            if(mutationRecord.target.classList.contains("has-request-results")){
                downloadExports(userDataRequests);
                downloadsDoneObserver.disconnect();
            };
        });
    };
    const downloadsDoneObserver = new MutationObserver(handleDownloadsDone);
    const userDataRequests = Array.from(document.getElementById("the-list").children);
    exportPageRequestCount = userDataRequests.length;
    await chrome.storage.local.set({exportPageRequestCount:exportPageRequestCount});
    downloadExports(userDataRequests);
    chrome.runtime.onMessage.addListener((message,sender,sendResponse) => {
        switch(message.command){
            case "remove-request":
                console.log(`Download for ${message.requestor} was detected`);
                if(userDataRequests.length > 0){
                    const requestIndex = userDataRequests.findIndex(dataRequest => dataRequest.querySelector("a").innerText.split("@")[0].replaceAll(/\W/g,"").toLowerCase().match(message.requestor));
                    if(requestIndex !== -1){
                        const removedRequest = userDataRequests.splice(requestIndex,1);
                        console.log(`Removed:`)
                        console.log(removedRequest);
                        console.log(`Remaining requests: ${userDataRequests.length}`)
                        sendResponse({status:`Removed request for requestor ${message.requestor} from remaining exports\nRemaining requests: ${userDataRequests.length}`});
                    }else sendResponse({status:`Could not identify request with requestor ${message.requestor}`});
                }else sendResponse({status:`${message.command} was received on an empty user list`});
            break;
        };
    return true;
    });
})();