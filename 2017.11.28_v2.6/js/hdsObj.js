const F4F = {}; // namespace

F4F.CONSTANTS = Object.freeze({
    'AUDIO': 0x08,
    'VIDEO': 0x09,
    'AKAMAI_ENC_AUDIO': 0x0A,
    'AKAMAI_ENC_VIDEO': 0x0B,
    'SCRIPT_DATA': 0x12,
    'FRAME_TYPE_INFO': 0x05,
    'CODEC_ID_AVC': 0x07,
    'CODEC_ID_AAC': 0x0A,
    'AVC_SEQUENCE_HEADER': 0x00,
    'AAC_SEQUENCE_HEADER': 0x00,
    'AVC_NALU': 0x01,
    'AVC_SEQUENCE_END': 0x02,
    'FRAMEFIX_STEP': 40,
    'INVALID_TIMESTAMP': -1,
    'STOP_PROCESSING': 2,
    'FLV_HEADER': 0,
    'FLV_METADATA': 1
});

F4F.HDS = (function() {      
    
    var auth = "", baseFilename = "", baseUrl = "", bootstrapUrl = "", debug = false, decoderTest = false, fileCount = 1, fixWindow = 1000;
    
    var format = "", live = false, medias = [], metadata = true, outDir = "", outFile = "", parallel = 8, play = false, processed = false, quality = "high", rename = false, sessionID = "", srt;
    
    var segTable = [], fragTable = [], segStart = false, fragStart = false, frags = [], fragCount = 0, lastFrag = 0, fragUrl, discontinuity = "";

    var headerAndMetaData = "";
    
    var videoFragsBytesArray = [];
    
    
    
    // ------- DECODER --------     
    let audio, duration, filesize, video, prevTagSize, tagHeaderLen, baseTS, negTS,
        prevAudioTS, prevVideoTS, pAudioTagLen, pVideoTagLen, pAudioTagPos, pVideoTagPos,
        prevAVC_Header, prevAAC_Header, AVC_HeaderWritten, AAC_HeaderWritten;
    
    
    const getAAC_HeaderWritten = function() {
        return AAC_HeaderWritten;
    };
    const setAAC_HeaderWritten = function(val) {
        AAC_HeaderWritten = val;
    };
    
    const getAVC_HeaderWritten = function() {
        return AVC_HeaderWritten;
    };
    const setAVC_HeaderWritten = function(val) {
        AVC_HeaderWritten = val;
    };
    
    const getAudio = function() {
        return audio;
    };
    const setAudio = function(val) {
        audio = val;
    };
    
    const getBaseTS = function() {
        return baseTS;
    }; 
    const setBaseTS = function(val) {
        baseTS = val;
    }; 
    
    const getDebug = function() {
        return debug;
    };  
    
    const getDecoderTest = function() {
        return decoderTest;
    };
    const setDecoderTest = function(val) {
        decoderTest = val;
    };
    
    const getDuration = function() {
        return duration;
    };
    const setDuration = function(val) {
        duration = val;
    };
    
    const setFilesize = function(val) {
        filesize = val;
    };
    
    
    const getNegTS = function() {
        return negTS;
    }; 
    const setNegTS = function(val) {
        negTS = val;
    };
    
    const setPAudioTagLen = function(val) {
        pAudioTagLen = val;
    };
    
    const getPAudioTagPos = function() {
        return pAudioTagPos;
    };
    const setPAudioTagPos = function(val) {
        pAudioTagPos = val;
    };
    
    const setPVideoTagLen = function(val) {
        pVideoTagLen = val;
    };
    const getPVideoTagPos = function() {
        return pVideoTagPos;
    };
    const setPVideoTagPos = function(val) {
        pVideoTagPos = val;
    };
    
    const getPrevAAC_Header = function() {
        return prevAAC_Header;
    };
    const setPrevAAC_Header = function(val) {
        prevAAC_Header = val;
    };
    
    const getPrevAVC_Header = function() {
        return prevAVC_Header;
    };
    const setPrevAVC_Header = function(val) {
        prevAVC_Header = val;
    };
    
    const getPrevAudioTS = function() {
        return prevAudioTS;
    }; 
    const setPrevAudioTS = function(val) {
        prevAudioTS = val;
    }; 
    
    const getPrevVideoTS = function() {
        return prevVideoTS;
    };  
    const setPrevVideoTS = function(val) {
        prevVideoTS = val;
    };  
    
    const getPrevTagSize = function() {
        return prevTagSize;
    };  
    
    const getTagHeaderLen = function() {
        return tagHeaderLen;
    };
    
    const getVideo = function() {
        return video;
    }; 
    const setVideo = function(val) {
        video = val;
    };
    // ------- END DECODER --------  
    
    
    return {
        
        // ------- INIT DECODER --------     
        initDecoder: function() {
            audio = false;
            duration = 0;
            filesize = 0;
            video = false;
            prevTagSize = 4;
            tagHeaderLen = 11;
            baseTS = F4F.CONSTANTS.INVALID_TIMESTAMP;
            negTS = F4F.CONSTANTS.INVALID_TIMESTAMP;
            prevAudioTS = F4F.CONSTANTS.INVALID_TIMESTAMP;
            prevVideoTS = F4F.CONSTANTS.INVALID_TIMESTAMP;
            pAudioTagLen = 0;
            pVideoTagLen = 0;
            pAudioTagPos = 0;
            pVideoTagPos = 0;
            prevAVC_Header = false;
            prevAAC_Header = false;
            AVC_HeaderWritten = false;
            AAC_HeaderWritten = false;
        },
        
        // ------- DECODER METHODS -------- 
        getAAC_HeaderWritten: getAAC_HeaderWritten,
        setAAC_HeaderWritten: setAAC_HeaderWritten,
        getAVC_HeaderWritten: getAVC_HeaderWritten,
        setAVC_HeaderWritten: setAVC_HeaderWritten,
        
        getAudio: getAudio,  
        setAudio: setAudio,
        
        getBaseTS: getBaseTS,
        setBaseTS: setBaseTS,
        
        getDecoderTest: getDecoderTest,
        setDecoderTest: setDecoderTest,  
        
        getDebug: getDebug,
        
        getDuration: getDuration,
        setDuration: setDuration,
        
        setFilesize: setFilesize,
        
        getNegTS: getNegTS,
        setNegTS: setNegTS,
        
        setPAudioTagLen: setPAudioTagLen,
        setPVideoTagLen: setPVideoTagLen,
        
        getPAudioTagPos: getPAudioTagPos,
        setPAudioTagPos: setPAudioTagPos,
        
        getPVideoTagPos: getPVideoTagPos,
        setPVideoTagPos: setPVideoTagPos,
        
        getPrevAAC_Header: getPrevAAC_Header,
        setPrevAAC_Header: setPrevAAC_Header,
        
        getPrevAVC_Header: getPrevAVC_Header,
        setPrevAVC_Header: setPrevAVC_Header,
        
        getPrevAudioTS: getPrevAudioTS,
        setPrevAudioTS: setPrevAudioTS,
        
        getPrevVideoTS: getPrevVideoTS,
        setPrevVideoTS: setPrevVideoTS,
        
        getPrevTagSize: getPrevTagSize,
        
        getTagHeaderLen: getTagHeaderLen,
        
        getVideo: getVideo, 
        setVideo: setVideo,
        
        
        
        
        // -------- BASEFILENAME ------------
        setBaseFilename: function(val) {
            baseFilename = val;
        },

        getBaseFilename: function() {
            return baseFilename;
        },   



        // -------- BASEURL ------------
        setBaseURL: function(val) {
            baseUrl = val;
        },

        getBaseURL: function() {
            return baseUrl;
        },
        
        
        
        // -------- FLV FILE ------------
        appendHeaderAndMetaData: function(val) {
            headerAndMetaData += val;
        },
        
        getHeaderAndMetaData: function() {
            return headerAndMetaData;            
        },
        
        insertToFragsArray: function(num, val) {
            videoFragsBytesArray[num] = val;                
        },
        
        getFragsArray: function() {
            return videoFragsBytesArray;
        },
        
        clearPrevInfo: function() {
            headerAndMetaData = "";
            videoFragsBytesArray = [];
        },


        // -------- FRAGCOUNT ------    
        setFragCount: function(val) {
            fragCount = val;
        },

        getFragCount: function() {
            return fragCount;
        },

        updateFragCount: function(val) {
            fragCount += val;
        },
        
        
        // -------- FRAG NUMBER ------   
        setFragNum: function(val) {
            fragNum = val;
        },
        
        getFragNum: function() {
            return fragNum;
        },



        // -------- FRAGSTART ------------
        getFragStart: function() {
            return fragStart;
        },

        setFragStart: function(val) {
            fragStart = val;
        },    



        // -------- FRAGURL ------   
        setFragURL: function(val) {
            fragUrl = val;
        },

        getFragURL: function() {
            return fragUrl;
        },



        // -------- LIVE ------------
        setLive: function(val) {
            live = val;
        },

        getLive: function() {
            return live;
        },  



        // ------- MEDIA --------
        getMediaArray: function() {
            return medias;
        }, 

        setMediaArray: function(arr) {
            medias = [];
            medias.push(arr);
        }, 
        
        clearMediaArray: function() {
            medias = [];
        },

        getMediaByKey: function(key) {   

            var found = null;
            for (var i = 0; i < medias.length; i++) {  

                if (medias[i][0] == Number(key)) {
                    found = medias[i][1];
                    break;
                }
            }
            return found;
        },
        
        
        getMediaValueByName: function(name) {   

            var found = null;
            for (var i = 0; i < medias.length; i++) {  

                if (medias[i][1][name]) {
                    found = medias[i][1][name];
                    break;
                }
            }
            return found;
        },
        

        setMediaAtKey: function(key, value) {        
            medias.push([key, value]);        
        },

        getMediaLength: function() {
            return medias.length;
        },

        sortMediaDesc: function() {
            medias.sort(function(a, b) {

                a = a[0];
                b = b[0];

                return b - a;
            });
        },


        // ------- METADATA --------
        getMetaData: function() {
            return metadata;
        },
        
        setMetaData: function(val) {
            metadata = val;
        },
        

        // ------- QUALITY -----------
        getQuality: function() {
            return quality;        
        },

        setQuality: function(q) {
            quality = q;
        },

        decrementQuality: function() {
            quality -= 1;
        },



        // -------- SEGSTART ------------
        getSegStart: function() {
            return segStart;
        },

        setSegStart: function(val) {
            segStart = val;
        },
    


        // ------- SEGTABLE AND FRAGTABLE ----------
        getSegTable: function() {
            return segTable;
        },

        getFragTable: function() {
            return fragTable;
        },
        // ------------------

        initTable: function(tableArray) {
            tableArray = [];
        },  

        getFirstElementsObject: function(tableArray) { // returns the OBJECT VALUE of the FIRST element of tableArray
            if (tableArray.length > 0) {
                var first = tableArray[0];
                return Object.values(first)[0]; 
            }
            else {
                return null;
            }
        },

        getLastElementsObject: function(tableArray) {// returns the OBJECT VALUE of the LAST element of tableArray
            if (tableArray.length > 0) {
                var last = tableArray[tableArray.length - 1];
                return Object.values(last)[0];
            }
            else {
                return null;
            }
        },     

        replaceTable: function(val, tableArray) { // VAL = array[{key, obj}], obj = {firstSegment: v1, fragmentsPerSecond: v2}, TABLEARRAY - segTable or fragTable

            var props = [];
            // collect all the keys to search them later in TABLEARRAY
            for(let i = 0; i < val.length; i++) {           
                for (let prop in val[i]) {
                    if (val[i].hasOwnProperty(prop)) {
                        props.push(val[i]);                
                    }
                }
            }   

            // TABLEARRAY is an array containing arrays (most probably only 1 arr, so take it as default)
            //for(let i = 0; i < tableArray.length; i++) {

            // each item in TABLEARRAY contains an array of objects {key, obj}
            // when a {key, obj} is not found in TABLEARRAY, it's placed to notFoundObjs
            var notFoundObjs = [];

            if (tableArray.length > 0) {
                let curSeg = tableArray;
                for (let z = 0; z < curSeg.length; z++) {
                    for (let j = 0; j < props.length; j++) {

                        let tt = Object.keys(props[j])[0]; // numbered property, f.ex. 1, 146, etc.
                        if (curSeg[z].hasOwnProperty(tt)) {

                            // substitute the found object by the corresponding one from the VAL array
                            curSeg[z] = props[j];
                        }
                        else {
                            notFoundObjs.push(props[j]);
                        }
                    }
                }
            }
            // if TABLEARRAY empty, just push all the {key, obj} objects
            else {
                for (let j = 0; j < props.length; j++) {
                    tableArray.push(props[j]);
                }
            }
           // } 
        },



        // -------- VARIOUS ------------      
        getAuth: function() {
            return auth;
        },

        getDebug: function() {
            return debug;
        },

        setLastFrag: function(val) {
            lastFrag = val;
        },        
        
        getFixWindow: function() {
            return fixWindow;
        }

        
    
    };
    
})();//(this.HDS = {});    