(() => {
    const downloadExports = dataRequests => {
        dataRequests.forEach((request,i) => {
            setTimeout(() => request.querySelector('button.export-personal-data-handle').click(),i * 2000);
            if(i === requestCount - 1){
                console.log(`Adding event listener to last export button`);
                request.querySelector('button.export-personal-data-handle').addEventListener('click',() => {
                    let queries = 0;
                    const intervalId = setInterval(() => {
                        if(request.nextElementSibling.classList.contains('request-results')){
                            clearInterval(intervalId);
                            chrome.runtime.sendMessage({request:'export-personal-data',requestCount:requestCount},response => console.log(response.status));
                        };
                        queries++;
                        if(queries >= 240){
                            clearInterval(intervalId);
                            chrome.runtime.sendMessage({request:'export-personal-data',requestCount:requestCount},response => console.log(response.status));
                        };
                        console.log(`Scanned for .request-results on last data request ${queries} times`)
                    },500);
                });
            };
        });
    };
    const sanitizeRequestor = requestorString => requestorString.toLowerCase().replace("wp-personal-data-file-","").replace(/\-\w+.zip/,"").replaceAll(/\./g,"-").replaceAll(/\+/g,"");
    const dataRequests = Array.from(document.querySelector("#the-list").children);
    const requestCount = dataRequests.length;
    console.log(`Content script injected successfully`);
    chrome.storage.local.get('exportStatus',storageObject => storageObject.exportStatus ? downloadExports(dataRequests) : console.log(`${requestCount} data requests found`))
    chrome.runtime.onMessage.addListener((message,sender,sendResponse) => {
        switch(message.command){
            case "remove-request":
                console.log(`Received ${message.command} from background.js`);
                let requestor = sanitizeRequestor(message.fileName);
                requestor = requestor.slice(0,requestor.search("-at-"));
                console.log(`Download for ${requestor} was detected`);
                if(dataRequests.length > 0){
                    const requestIndex = dataRequests.findIndex(request => sanitizeRequestor(request.innerText).includes(requestor));
                    if(requestIndex !== -1){
                        const removedRequest = dataRequests.splice(requestIndex,1);
                        console.log(`Removed: ${removedRequest} from remaining exports\n${dataRequests.length} requests remaining`);
                        sendResponse({status:`Removed: ${removedRequest} from remaining exports`});
                        if(dataRequests.length === 0){chrome.runtime.sendMessage({request:'export-personal-data',downloadsComplete:true})};
                    };
                };
            break;
            case "get-remaining-exports":
                console.log(`Received ${message.command} from background.js`);
                downloadExports(dataRequests);
                sendResponse({status:'Export page retrying'});
            break;
            case "downloads-complete":
                console.log(`Received ${message.command} from background.js`);
                dataRequests.length === 0 ? chrome.runtime.sendMessage({request:'export-personal-data',downloadsComplete:true}) : chrome.runtime.sendMessage({request:'export-personal-data',requestCount:requestCount},response => console.log(response.status));
            break;
        };
        return true;
    });
})();