(() => {
    const downloadExports = dataRequests => {
        dataRequests.forEach((request,i) => {
            setTimeout(() => request.querySelector('button.export-personal-data-handle').click(),i * 2000);
            i >= dataRequests.length - 1 ? observer.observe(request,{attributes:true,attributeFilter:["class"]}) : undefined;
        });
    };
    const handleMutation = mutationList => {
        mutationList.forEach(mutationRecord => {
            if(mutationRecord.target.classList.contains("has-request-results")){
                chrome.runtime.sendMessage({request:'export-personal-data',requestCount:requestCount},response => console.log(response.status));
                observer.disconnect();
            };
        });
    };
    const observer = new MutationObserver(handleMutation);
    const userDataRequests = Array.from(document.getElementById("the-list").querySelectorAll("tr.status-request-completed"));
    const requestCount = userDataRequests.length;
    console.log(`Content script injected successfully`);
    chrome.storage.local.get('exportWindow',storageObject => {
        if(storageObject.exportWindow){
            downloadExports(userDataRequests);
            chrome.runtime.onMessage.addListener((message,sender,sendResponse) => {
                switch(message.command){
                    case "remove-request":
                        console.log(`Download for ${message.requestor} was detected`);
                        if(userDataRequests.length > 0){
                            const requestIndex = userDataRequests.findIndex(dataRequest => dataRequest.querySelector("a").innerText.split("@")[0].replaceAll(/\W/g,"").toLowerCase().includes(message.requestor));
                            if(requestIndex !== -1){
                                const removedRequest = userDataRequests.splice(requestIndex,1);
                                console.log(`Removed:`)
                                console.log(removedRequest);
                                console.log(`Remaining requests: ${userDataRequests.length}`)
                                sendResponse({status:`Removed request for requestor ${message.request} from remaining exports\nRemaining requests: ${userDataRequests.length}`});
                                if(userDataRequests.length === 0){chrome.runtime.sendMessage({request:'export-personal-data',downloadsComplete:true})};
                            };
                        };
                    break;
                    case "get-remaining-exports":
                        console.log(`Received ${message.command} from extension`);
                        console.log(`Remaining exports: ${userDataRequests.length}`);
                        if(userDataRequests.length > 0){
                            sendResponse({status:`Export page initiating downloads on ${userDataRequests.length} remaining requests`});
                            downloadExports(userDataRequests);
                        }else{
                            sendResponse({status:`ERROR: Received ${message.command} command on an empty request list`});
                            throw new Error(`ERROR: Received ${message.command} command on an empty request list`);
                        };
                    break;
                    case "downloads-complete":
                        console.log(`Received ${message.command} from extension`);
                        if(userDataRequests.length === 0){
                            sendResponse({status:`Export page sending downloads-complete message with ${userDataRequests.length} requests reamining`});
                            chrome.runtime.sendMessage({request:'export-personal-data',downloadsComplete:true})
                        }else{
                            sendResponse({status:`Export page sending request-count message with ${userDataRequests.length} requests reamining`});
                            chrome.runtime.sendMessage({request:'export-personal-data',requestCount:requestCount});
                        };
                    break;
                };
                return true;
            });
        };
    });
})();