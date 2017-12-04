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
    var retryCounts = [];
    var xhr = [];
    
    updateHTML.showProgressWindow(mySlices.length);
    
    for (var i = 0; i < mySlices.length; i++) {
        downloadSlice(i);
    }

    function downloadSlice(i) {
        function handleErr(i) {
            const RETRY_LIMIT = 5;
            updateHTML.errorProgressBar(i+1);
            if (retryCounts[i] > RETRY_LIMIT)
                return false;
            else {
                setTimeout(downloadSlice.bind(null, i), 2000);
                retryCounts[i]++;
            }
        }
        xhr[i] = new XMLHttpRequest();
        xhr[i].open("GET", mySlices[i], true);
        xhr[i].onreadystatechange = function() {
            if (xhr[i].readyState == 4) {
                if (xhr[i].status == 200) {
                    console.log(`Done, ts index: ${i}, ts url ${mySlices[i]}`);
                    let fullDownload = Number.isInteger(xhr[i].total) &&
                        xhr[i].loaded === xhr[i].total;
                    if (!fullDownload) {
                        console.log('Length mismatch', xhr[i].total, xhr[i].loaded);
                        if (handleErr(i))
                            return;
                    }
                    requestsCount++;
                    myBlobBuilder.append(xhr[i].response, i);
                    updateHTML.successProgressBar(i+1);
                    if (requestsCount === mySlices.length) {
                        myBlobBuilder.sort();
                        var bb = myBlobBuilder.getBlob("video/mp2t");
                        // all done
                        updateHTML.displayAllDone();
                        exports.saveData(bb, "video");
                    }
                } else {
                    console.log(`Failed, ts index: ${i}, ts url ${mySlices[i]}`);
                    console.log('Failed', xhr[i].total, xhr[i].loaded, xhr[i]);
                    // if it failed but we decide not to retry, just increment count
                    if (!handleErr(i))
                        requestsCount++;
                }
            }
        };
        // update UI
        xhr[i].onprogress = function(e) {
            updateHTML.initProgressBar(e.total, e.loaded, i+1);
            xhr[i].total = e.total;
            xhr[i].loaded = e.loaded;
        };
        xhr[i].onloadstart = function(e) {
            updateHTML.startProgressBar(e, i+1);
            xhr[i].total = e.total;
        };
        xhr[i].onloadend = function(e) {
            updateHTML.endProgressBar(e.loaded, i+1);
        };
        xhr[i].responseType = "blob";
        xhr[i].send();
    }
};