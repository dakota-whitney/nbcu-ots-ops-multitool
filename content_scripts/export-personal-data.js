(() => {
    chrome.storage.local.get('exportPageRequestCount')
    .then(storageObject => {
        if(storageObject.hasOwnProperty('exportPageRequestCount')){
            console.log(`Content script injected successfully`);
            const downloadExports = dataRequests => {
                if(dataRequests.length > 0){
                    dataRequests.forEach((request,i) => {
                        setTimeout(() => request.querySelector('button.export-personal-data-handle').click(),i * 2000);
                        i >= dataRequests.length - 1 ? observer.observe(request,{attributes:true,attributeFilter:["class"]}) : undefined;
                    });
                }else throw new Error('downloadExports was called on an empty list')
            };
            const handleMutation = mutationList => {
                mutationList.forEach(mutationRecord => {
                    if(mutationRecord.target.classList.contains("has-request-results")) downloadExports(userDataRequests);
                });
            };
            const observer = new MutationObserver(handleMutation);
            const userDataRequests = Array.from(document.getElementById("the-list").children);
            chrome.storage.local.set({exportPageRequestCount:userDataRequests.length}).then(() => downloadExports(userDataRequests))
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
                            }else console.warn(`Could not identify request with requestor ${message.requestor}`)
                        };
                    break;
                };
                return true;
            });
        }else throw new Error(`Could not identify exportPageRequestCount in Chrome Storage`)
    });
})();