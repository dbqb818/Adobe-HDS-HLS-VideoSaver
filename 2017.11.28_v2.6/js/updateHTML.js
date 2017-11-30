(function (uH) {
    
    //var spinner;
    var mainP;
    var progressBars = [];
    
//    var startSpin = function() {
//        // spinner
//        var opts = {lines:30,length:10,width:1,radius:10,corners:1,rotate:0,direction:1,color:'#000',speed:1,trail:60,shadow: false,hwaccel:false,zIndex:2e9,top:'60%',left:'50%'};
//        var target =  mainP;
//        spinner = new Spinner(opts);
//        spinner.spin(target);
//    };
//    
//    var stopSpin = function() {
//        spinner.spin(false); 
//    };
    
    updateHTML.showProgressWindow = function(partCount) {
        mainP = document.createElement('p');
        mainP.innerHTML = 'Parts to download: ' + partCount;
        document.getElementById('hlsProcess').className = 'hlsProcessClass';
        document.getElementById('hlsProcess').appendChild(mainP);
        
        //startSpin();
    };
    
    // add info about the current part downloaded
//    updateHTML.displayDownloadProgress = function(number) {
//        var partSpan = document.createElement('span');
//        partSpan.innerHTML = 'part ' + number + '&nbsp;&nbsp;&nbsp;';
//        var imgOk = document.createElement('img');                                        
//        imgOk.src = './imgs/check.png';
//        partSpan.appendChild(imgOk);                                        
//        document.getElementById('hlsProcess').appendChild(partSpan);
//        var br = document.createElement('br');
//        document.getElementById('hlsProcess').appendChild(br);
//    };
    
    updateHTML.initProgressBar = function(max, val, num) {
        
        if (!progressBars[num]) {
            var partSpan = document.createElement('span');
            partSpan.innerHTML = 'part ' + num + '&nbsp;&nbsp;&nbsp;';

            var progress = document.createElement('progress');
            progress.max = max;
            progress.value = val;
            progressBars[num] = progress;

            partSpan.appendChild(progress);            
            document.getElementById('hlsProcess').appendChild(partSpan);
            var br = document.createElement('br');
            document.getElementById('hlsProcess').appendChild(br);
        }
        else {
            progressBars[num].value = val;
        }
    };
    
    updateHTML.startProgressBar = function(e, num) {
        
        if (progressBars[num]) {
            progressBars[num].value = 0;
        }
    };
    
    updateHTML.endProgressBar = function(val, num) {
        if (progressBars[num]) {
            progressBars[num].value = val;
            progressBars[num].classList.remove('red');
        }
    };
    
    updateHTML.displayAllDone = function() {
        var partSpan = document.createElement('span');
        partSpan.innerHTML = 'All parts downloaded.';
        document.getElementById('hlsProcess').appendChild(partSpan);
        
       // stopSpin();
    };
    
    updateHTML.errorProgressBar = function(num) {
        if (progressBars[num]) {
            progressBars[num].classList.add('red');
        }
    };
    
//    updateHTML.displayError() = function() {
//        var partSpan = document.createElement('span');
//        partSpan.innerHTML = 'part ' + (i+1) + '&nbsp;&nbsp;&nbsp;';
//        var imgFail = document.createElement('img');                                        
//        imgFail.src = './imgs/fail.png';
//        partSpan.appendChild(imgFail);                                        
//        document.getElementById('hlsProcess').appendChild(partSpan);
//        var br = document.createElement('br');
//        document.getElementById('hlsProcess').appendChild(br);
//    };
    
    
    
})(this.updateHTML = {});