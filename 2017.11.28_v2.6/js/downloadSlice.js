if (!window.adobeHdsHlsVideoSaver) {
    window.adobeHdsHlsVideoSaver = {};
}
let exports = window.adobeHdsHlsVideoSaver;

exports.saveData = function (blob, fileName) {
    var a = document.createElement("a");
    document.getElementById('hlsLinks').appendChild(a);
    a.style = "display: none";
    url = window.URL.createObjectURL(blob);
    a.href = url;
    a.download = fileName + '.ts';
    a.click();
    window.URL.revokeObjectURL(url);    
};

exports.downloadSlices = function(opt) {
    let url = opt.url, slices = opt.slices, mySlices = slices[url];
    var myBlobBuilder = new MyBlobBuilder();
    var requestsCount = 0;
    var xhr = [];
    
    updateHTML.showProgressWindow(mySlices.length);
    
    for (var i = 0; i < mySlices.length; i++) {
        downloadSlice(i);
    }

    function downloadSlice(i) {
        xhr[i] = new XMLHttpRequest();
        xhr[i].open("GET", mySlices[i], true);
        xhr[i].onreadystatechange = function() {
            if (xhr[i].readyState == 4) {
                if (xhr[i].status == 200) {                                                                        
                    requestsCount++; 
                    myBlobBuilder.append(xhr[i].response, i);
                    if (requestsCount === mySlices.length) {
                        myBlobBuilder.sort();
                        var bb = myBlobBuilder.getBlob("video/mp2t");                               
                        // all done                                                    
                        updateHTML.displayAllDone();
                        exports.saveData(bb, "video");                             
                    }
                } else {
                    console.log(`Download failed for manifest: ${url},
                        ts index: ${i}, ts url ${mySlices[i]}`, xhr[i]);                       
                }
            }
        };
        // update UI
        xhr[i].onprogress = function(e) {
            updateHTML.initProgressBar(e.total, e.loaded, i+1);
        };
        xhr[i].onloadstart = function(e) {
            updateHTML.startProgressBar(e, i+1);
        };
        xhr[i].onloadend = function(e) {
            updateHTML.endProgressBar(e.loaded, i+1);
        };
        xhr[i].responseType = "blob";
        xhr[i].send();
    }
};