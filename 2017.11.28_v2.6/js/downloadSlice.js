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

exports.downloadSlice = function(opt) {
    
}