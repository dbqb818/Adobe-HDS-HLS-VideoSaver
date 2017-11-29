var callRemote = function(url, cb) {      
    var xhr = new XMLHttpRequest();
    xhr.open("GET", url, true);
    xhr.onreadystatechange = function() {
        if (xhr.readyState == 4) {    
            cb(xhr.responseText);            
        }
    }
    xhr.send();
}
var urls = [];
var slices = {};
var videoType = "";

chrome.extension.onMessage.addListener(function(request, sender, send_response) {
    if (request.type === "urls") {
    	urls = request.value;        
	}
    if (request.type === "slices") {
    	slices = request.value;        
	}
});



var processData = function(details, regex, regex2) {
    if (urls.indexOf(details.url) === -1) {           
       
        urls.push(details.url);
    
    
        var urlObj = new URL(details.url);        

        callRemote(details.url, function(resp) {

            slices[details.url] = [];             

            var match = regex.exec(resp);
            if (!match)
                match = regex2.exec(resp);

            while(match != null) {
                // remove the first '/' in the matched url
                if (match[1] && match[1].indexOf('/') == 0)
                    match[1] = match[1].substr(1, match[1].length);


                var wholeURL;

                // if m3u8 contains fully functional urls, use them, otherwise combine the biggest part
                // of the details.url with what m3u8 contains
                // deal with possible overlay (when both details.url and match[1] contain same parts)
                if (match[1].indexOf('http://') != -1 || match[1].indexOf('https://') != -1) {
                    wholeURL = match[1];
                }
                else {
                    var firstURLPart = urlObj.origin;

                    var urlPartsArr = urlObj.pathname.split('/');
                    // last part not needed
                    urlPartsArr.pop();

                    var matchPartsArr = match[1].split('/');

                    for (var i = 0; i < urlPartsArr.length; i++) {
                        if (urlPartsArr[i] == "") continue;
                        if (urlPartsArr[i] != matchPartsArr[0]) {
                            firstURLPart += '/' + urlPartsArr[i];
                        }
                        else {
                            break;
                        }
                    }


                    wholeURL = firstURLPart + "/" + match[1];
                }

                slices[details.url].push(wholeURL);                    
                match = regex.exec(resp);
            }

            chrome.tabs.executeScript(null, {code: "var urls = " + urls + ", var slices = " + slices + ";"}, function() {
                chrome.storage.local.set({ 'slices': slices, 'videoType': videoType }, function() {    
                }); 
            });          

        });            
    }
}

//chrome.storage.local.clear();


chrome.webRequest.onCompleted.addListener(function(details) {
    

    //var extension = details.url.split('.').pop();
    var extensionMatch = details.url.match(/\.([^\./\?]+)($|\?)/);
    var extension;
    
    if (extensionMatch) {
        extension = extensionMatch[1];
        
        var regex, regex2;
    
        // m3u8 (apple) videos
        if(extension.indexOf('m3u8') !== -1){

           videoType = 'hls';
           regex = /#EXTINF:.+\n(.+)/gi; ///#EXTINF:.+?,\n(.+)/gi;
           regex2 = /#EXTINF:.+\r\n(.+)/gi; ///#EXTINF:.+?,\r\n(.+)/gi;

        }
        // f4f (adobe) videos
        else if(extension.indexOf('f4m') !== -1) {

            videoType = 'hds';
            regex = /url="(.*?)"/gi;
        }

        if (regex) {
            processData(details, regex, regex2);
        }
    }
    

}, {
    urls: ["<all_urls>"]
});