var saveData = function (blob, fileName) {
    var a = document.createElement("a");
    document.getElementById('hlsLinks').appendChild(a);
    a.style = "display: none";
    url = window.URL.createObjectURL(blob);
    a.href = url;
    a.download = fileName + '.ts';
    a.click();
    window.URL.revokeObjectURL(url);    
};


if (window.location.href.indexOf('chrome-extension:') !== -1 && window.location.href.indexOf('download.html') !== -1) {
 

chrome.storage.local.get(null, function(items) {   
    if (items.slices) {   
        
        for  (var key in items.slices) {
            if (items.slices[key].length > 0) {
                      
                // adobe HDS streaming videos
                if(items.videoType === 'hds') {
                    
                    (function(key) {
                        // get info from the manifest
                        $.ajax({
                            type: "GET",
                            url: key,
                            dataType: 'xml',  
                            success: function (obj, textstatus) {
                                try {
                                    
                                    const simpleXmlObj = utils.simplexml_load_string(obj);  
                                    const manifestXml = obj.children[0];
                                    adobe.parseManifest(simpleXmlObj, manifestXml, key);                                   
                                   
                                    for (let i = 0; i < F4F.HDS.getMediaLength(); i++) {
                                        let curMediaItem = F4F.HDS.getMediaArray()[i];
                                        //debugger;
                                        
                                        (function(curMediaItem) {
                                            
                                            let a = document.createElement('a');
                                            a.title = curMediaItem[1].url + ' (bitrate: ' + curMediaItem[0] + ')';
                                            a.text = curMediaItem[1].url + ' (bitrate: ' + curMediaItem[0] + ')';
                                            
                                            
                                            a.onclick = function() {                                            
                                                
                                                F4F.HDS.clearPrevInfo();
                                                adobe.downloadFragments(obj, curMediaItem);                       
                                            };
                                            


                                            document.getElementById('hlsLinks').appendChild(a);
                                            let br = document.createElement('br');
                                            document.getElementById('hlsLinks').appendChild(br);
                                            let br2 = document.createElement('br');
                                            document.getElementById('hlsLinks').appendChild(br2);
                                            
                                        })(curMediaItem);
                                    }

                                    F4F.HDS.clearMediaArray();
                                   
                                }
                                catch(e) {
                                    debugger;   
                                }

                            },
                            error: function(XMLHttpRequest, textStatus, errorThrown) {    
                                debugger;
                            }
                        });

           
                    })(key);
                }
        
                // apple HLS streaming videos
                else if (items.videoType === 'hls' && key.indexOf('.f4m') === -1){ 

                    var a = document.createElement('a');
                    a.title = key;
                    a.text = key;

                    (function(key) {
                        a.onclick = function() {

                            var myBlobBuilder = new MyBlobBuilder();                    
                            var requestsCount = 0;
                            var xhr = [];

                            // update UI                            
                            updateHTML.showProgressWindow(items.slices[key].length);
                            
                            
                            for (var i = 0; i < items.slices[key].length; i++){
                                (function (i) {
                                    xhr[i] = new XMLHttpRequest();
                                    xhr[i].open("GET", items.slices[key][i], true);
                                    xhr[i].onreadystatechange = function() {
                                        if (xhr[i].readyState == 4) {
                                            
                                            if (xhr[i].status == 200) { 
                                                                                                                                          
                                                requestsCount++; 
                                                
                                                myBlobBuilder.append(xhr[i].response, i); 
                                                
                                                if (requestsCount == items.slices[key].length) {

                                                    myBlobBuilder.sort();

                                                    var bb = myBlobBuilder.getBlob("video/mp2t");
                                                                                                        
                                                    // all done                                                    
                                                    updateHTML.displayAllDone();
                                                    saveData(bb, "video");                                            
                                                }
                                            }
                                            else {            
                                                console.log(xhr[i].status);
                                                //error
                                                //updateHTML.displayError();                                               
                                            }
                                        }
                                    };
                                    
                                    // update UI
                                    xhr[i].onprogress = function(e) {
                                       //if (e.lengthComputable) {
                                            updateHTML.initProgressBar(e.total, e.loaded, i+1);
                                      //  }
                                    };
                                    xhr[i].onloadstart = function(e) {
                                        updateHTML.startProgressBar(e, i+1);
                                    };
                                    xhr[i].onloadend = function(e) {
                                        updateHTML.endProgressBar(e.loaded, i+1);
                                    };
                                    xhr[i].responseType = "blob";
                                    xhr[i].send();
                                    })(i);
                                }                    
                            }
                        })(key);

                    
                    document.getElementById('hlsLinks').appendChild(a);

                    var br = document.createElement('br');
                    document.getElementById('hlsLinks').appendChild(br);
                    var br2 = document.createElement('br');
                    document.getElementById('hlsLinks').appendChild(br2);

                
                }
            }
        }
    }
});
}

var setUp = function() {
    if (document.getElementById('hlsClearBtn')) {
        document.getElementById('hlsClearBtn').onclick = function () {
            document.getElementById('hlsMain').innerHTML = "";        
            chrome.storage.local.remove('slices');
            chrome.extension.sendMessage({type: "urls", value: []});
            chrome.extension.sendMessage({type: "slices", value: {}});
        };
    }
};

document.addEventListener('DOMContentLoaded', setUp);