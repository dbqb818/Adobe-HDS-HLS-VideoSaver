chrome.storage.local.get(null, function(items) {   
    if (items.slices) {              
        
        for  (var key in items.slices) {
            if (items.slices[key].length > 0) {
                              
                document.getElementById('hlsSaveBtn').className = 'hlsClearButton';
                document.getElementById('hlsSaveBtn').onclick = function () {                                        
                    chrome.tabs.create({active: true, url: 'download.html'}, function(tab) {
                    });                         
                }; 
            }
        }
    }
});

var setUp = function(){
    document.getElementById('hlsSaveBtn').disabled = true;     
};

document.addEventListener('DOMContentLoaded', setUp);

