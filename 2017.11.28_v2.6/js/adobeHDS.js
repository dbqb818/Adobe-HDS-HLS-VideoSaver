(function (ad) {
    
      
    var parseAsrtBox = function(asrt, pos) {
        
        let segTable = [];
        //$version           = ReadByte($asrt, $pos);
        //$flags             = ReadInt24($asrt, $pos + 1);
        const qualityEntryCount = utils.readByte(asrt, pos + 4);
        pos += 5;

        let qualitySegmentUrlModifiers = [];
        for (let i = 0; i < qualityEntryCount; i++)
            qualitySegmentUrlModifiers[i] = utils.readString(asrt, pos);
        const segCount = utils.readInt32(asrt, pos);
        pos += 4;
        
        for (let i = 0; i < segCount; i++)
        {
            const firstSegment = utils.readInt32(asrt, pos);
            let segEntry = {};
            
            segEntry.firstSegment = firstSegment;
            segEntry.fragmentsPerSegment = utils.readInt32(asrt, pos + 4);
            if (segEntry.fragmentsPerSegment & 0x80000000)
                segEntry.fragmentsPerSegment = 0;
            pos += 8;

            segTable.push({[firstSegment]: segEntry});
        }
        
        return segTable;
    };
    
    
    var parseAfrtBox = function(afrt, pos) {
        
        let fragTable = [];
       // $version           = ReadByte($afrt, $pos);
       // $flags             = ReadInt24($afrt, $pos + 1);
       // $timescale         = ReadInt32($afrt, $pos + 4);
        const qualityEntryCount = utils.readByte(afrt, pos + 8);
        pos += 9;

        let qualitySegmentUrlModifiers = [];
        for (let i = 0; i < qualityEntryCount; i++)
            qualitySegmentUrlModifiers[i] = utils.readString(afrt, pos);

        const fragEntries = utils.readInt32(afrt, pos);
        pos += 4;
       // LogDebug(sprintf(" %-12s%-16s%-16s%-16s", "Number", "Timestamp", "Duration", "Discontinuity"));
        for (let i = 0; i < fragEntries; i++)
        {
            const firstFragment = utils.readInt32(afrt, pos);
            var fragEntry = {};
            fragEntry.firstFragment = firstFragment;
            fragEntry.firstFragmentTimestamp = utils.readInt64(afrt, pos + 4);
            fragEntry.fragmentDuration = utils.readInt32(afrt, pos + 12);
            fragEntry.discontinuityIndicator = "";
            pos += 16;
            if (fragEntry.fragmentDuration == 0)
                fragEntry.discontinuityIndicator = utils.readByte(afrt, pos++);

            fragTable.push( {[firstFragment]: fragEntry} );
            //fragTable[firstFragment] = fragEntry;
        }
        
        return fragTable;
    };
    
    
    var parseSegAndFragTable = function() {        
        
        const segTable = F4F.HDS.getSegTable();
        const fragTable = F4F.HDS.getFragTable();
        
        let firstSegment = F4F.HDS.getFirstElementsObject(segTable);
        let lastSegment = F4F.HDS.getLastElementsObject(segTable);
        
        let firstFragment = F4F.HDS.getFirstElementsObject(fragTable);
        let lastFragment = F4F.HDS.getLastElementsObject(fragTable);

        // Check if live stream is still live
        if (lastFragment && (lastFragment.fragmentDuration == 0) && (lastFragment.discontinuityIndicator == 0)) {
            F4F.HDS.setLive(false);
            utils.array_pop(fragTable);       
            lastFragment = F4F.HDS.getLastElementsObject(fragTable);
        }

        // Count total fragments by adding all entries in compactly coded segment table
        let invalidFragCount = false;
        let prev = F4F.HDS.getFirstElementsObject(segTable);
        if (prev)
            F4F.HDS.setFragCount(prev.fragmentsPerSegment);
        
        let ind = 1;
        let current = (ind >= segTable.length ? segTable[ind] : null);
        while (current) {
            
            F4F.HDS.updateFragCount((current.firstSegment - prev.firstSegment - 1) * prev.fragmentsPerSegment);
            F4F.HDS.updateFragCount(current.fragmentsPerSegment);
            prev = current;
            
            ind++;
            current = (ind >= segTable.length ? segTable[ind] : null);
            
        }
        
        if (!(F4F.HDS.getFragCount() & 0x80000000)) {
            F4F.HDS.updateFragCount(firstFragment.firstFragment - 1);
        }
        
        if (F4F.HDS.getFragCount() & 0x80000000) {
            F4F.HDS.setFragCount(0);
            invalidFragCount = true;
        }
        
        if (F4F.HDS.getFragCount() < lastFragment.firstFragment) {
            F4F.HDS.setFragCount(lastFragment.firstFragment);
        }
        
        // Determine starting segment and fragment
        if (F4F.HDS.getSegStart() === false) {
            if (F4F.HDS.getLive()) 
                F4F.HDS.setSegStart(lastSegment.firstSegment);            
            else 
                F4F.HDS.setSegStart(firstSegment.firstSegment);
            
            
            if (F4F.HDS.getSegStart() < 1) 
                F4F.HDS.setSegStart(1);            
        }
        
        if (F4F.HDS.getFragStart() === false) {
            if (F4F.HDS.getLive() && !invalidFragCount) 
                F4F.HDS.setFragStart(F4F.HDS.getFragCount() - 2);            
            else 
                F4F.HDS.setFragStart(firstFragment.firstFragment - 1);            
            
            if (F4F.HDS.getFragStart() < 0) 
                F4F.HDS.setFragStart(0);            
        }
    };
    
    
    var isHttpUrl = function(url) {
        return (utils.strncasecmp(url, "http", 4) == 0) ? true : false;
    };
    
    var normalizePath = function (path) {
        const inSegs  = path.split('/(?<!\/)\/(?!\/)/gi');
        let outSegs = [];

        inSegs.forEach(function (seg) {
            if (seg == '' || seg == '.'){}
            if (seg == '..')
                utils.array_pop(outSegs);
            else
                utils.array_push(outSegs, seg);
        });

        let outPath = utils.implode('/', outSegs);

        if (path.slice(0, 1) == '/')
            outPath = '/' + outPath;
        if (path.slice(-1) == '/')
            outPath += '/';
        return outPath;
    };   
    
    
    var absoluteUrl = function(baseUrl, url) {
        if (!isHttpUrl(url))
            url = joinUrl(baseUrl, url);
        return normalizePath(url);
    };

    
    var joinUrl = function(firstUrl, secondUrl) {
        if (firstUrl && secondUrl) {
            if (firstUrl.slice(-1) == '/')
                firstUrl = firstUrl.slice(0, -1);
            if (secondUrl.slice(0, 1) == '/')
                secondUrl = secondUrl.slice(1);
            return firstUrl + '/' + secondUrl;
        }
        else if (firstUrl)
            return firstUrl;
        else
            return secondUrl;
    };
    
    
    var isRtmpUrl = function(url) {
        return (url.match('/^rtm(p|pe|pt|pte|ps|pts|fp):\/\//i') ? true : false);
    };
    
    
    
    
    var readBoxHeader = function(str, objj) {
        
        let obj = (objj || {});
        
        if (!obj.pos)
          obj.pos = 0;
        obj.boxSize = utils.readInt32(str, obj.pos);
        obj.boxType = str.substr(obj.pos + 4, 4);
        if (obj.boxSize == 1) {
            obj.boxSize = utils.readInt64(str, obj.pos + 8) - 16;
            obj.pos += 16;
        }
        else {
            obj.boxSize -= 8;
            obj.pos += 8;
        }
        if (obj.boxSize <= 0)
          obj.boxSize = 0;
        
        return obj;
    };
    
    var readBoxHeaderArray = function(arr, objj) {
        
        let obj = (objj || {});
        
        if (!obj.pos)
          obj.pos = 0;
        obj.boxSize = utils.readInt32Array(arr, obj.pos);        
        obj.boxType = utils.getStringFromCharCode(arr, obj.pos + 4, 4); //str.substr(obj.pos + 4, 4);
        if (obj.boxSize == 1) {            
            obj.boxSize = utils.readInt64Array(arr, obj.pos + 8) - 16;
            obj.pos += 16;
        }
        else {
            obj.boxSize -= 8;
            obj.pos += 8;
        }
        if (obj.boxSize <= 0)
          obj.boxSize = 0;
        
        return obj;
    };
    
    
    var writeBoxSize = function(arr, pos, type, size) {
        //let str = (strr || {});
        
        const curType = utils.getStringFromCharCode(arr, pos - 4, 4);
        if (curType == type)
            arr = utils.writeInt32Array(arr, pos - 8, size);
        else {
            arr = utils.writeInt32Array(arr, pos - 8, 0);
            arr = utils.writeInt32Array(arr, pos - 4, size);
        }
        
        return arr;
    };
    
    var writeFlvTimestamp = function(fragHeader, fragPos, packetTS) {
        //const tempObj = {};
        fragHeader = utils.writeInt24(fragHeader, fragPos + 4, (packetTS & 0x00FFFFFF));
        fragHeader = utils.writeByte(fragHeader, fragPos + 7, (packetTS & 0xFF000000) >> 24);    
        
        return fragHeader;
    };
    
    var parseBootstrapBox = function(bootstrapInfo, pos) {
       
        let temp = {};       
        temp.pos = pos;
       // var version = readByte(bootstrapInfo, pos);
        //var flags = readInt24(bootstrapInfo, pos + 1);
       // var bootstrapVersion = readInt32(bootstrapInfo, pos + 4);
        const byte = utils.readByte(bootstrapInfo, temp.pos + 8);
        //var profile = (byte & 0xC0) >> 6;
        if ((byte & 0x20) >> 5)
        {
            F4F.HDS.setLive(true);
            F4F.HDS.setMetaData(false);
        }
        const update = (byte & 0x10) >> 4;
        if (!update)
        {
            F4F.HDS.initTable(F4F.HDS.getSegTable());
            F4F.HDS.initTable(F4F.HDS.getFragTable());
        }
        //var timescale = readInt32(bootstrapInfo, pos + 9);
        //var currentMediaTime = readInt64(bootstrapInfo, pos + 13);
        //var smpteTimeCodeOffset = readInt64(bootstrapInfo, pos + 21);
        temp.pos += 29;

        // ---- DON'T REMOVE, NEEDED FOR CHANGING OF TEMP.POS ----
        let movieIdentifier = utils.readString(bootstrapInfo, temp);
        // -------------------------------------------------------

        let serverEntryTable = [];
        const serverEntryCount = utils.readByte(bootstrapInfo, temp.pos++);
        for (let i = 0; i < serverEntryCount; i++)
            serverEntryTable[i] = utils.readString(bootstrapInfo, temp);

        let qualityEntryTable = [];
        const qualityEntryCount = utils.readByte(bootstrapInfo, temp.pos++);
        for (let i = 0; i < qualityEntryCount; i++)
            qualityEntryTable[i] = utils.readString(bootstrapInfo, temp);


        // ---- DON'T REMOVE, NEEDED FOR CHANGING OF TEMP.POS ----
        let drmData = utils.readString(bootstrapInfo, temp);
        let metadata = utils.readString(bootstrapInfo, temp);
        // -------------------------------------------------------


        const segRunTableCount = utils.readByte(bootstrapInfo, temp.pos++);
        let tempSegTable  = [];
        
        for (let i = 0; i < segRunTableCount; i++) {         
            readBoxHeader(bootstrapInfo, temp);
            if (temp.boxType == "asrt")
                tempSegTable[i] = parseAsrtBox(bootstrapInfo, temp.pos);               
            temp.pos += temp.boxSize;
        }
        
        
        const fragRunTableCount = utils.readByte(bootstrapInfo, temp.pos++);
        let tempFragTable = [];    
        
        for (let i = 0; i < fragRunTableCount; i++) {   
            readBoxHeader(bootstrapInfo, temp);
            if (temp.boxType == "afrt")
                tempFragTable[i] = parseAfrtBox(bootstrapInfo, temp.pos);
            temp.pos += temp.boxSize;
        }        
        
        F4F.HDS.replaceTable(tempSegTable[0], F4F.HDS.getSegTable());
        F4F.HDS.replaceTable(tempFragTable[0], F4F.HDS.getFragTable());
        
        parseSegAndFragTable();
    };
    
    
    adobe.parseManifest = function(simpleXmlObj, manifestXml, parentManifest) {
        
        let baseUrl;        
       
        if (simpleXmlObj.baseurl) {
            baseUrl = simpleXmlObj.baseurl;
        }
        else {
            baseUrl = parentManifest.substr(0, parentManifest.lastIndexOf('/'));
        }
        
        
        let childManifests = [];                                            
        childManifests.push({'bitrate': 0, 'url': parentManifest, 'xml': simpleXmlObj});
        let count = 1;

        let bitrate;


        childManifests.forEach(function(chM) {
            
            const streams = chM.xml.media;  
            streams.forEach(function(s) {

                const stream = s.attributes;
                stream.metadata = s.metadata;

                if (stream.bitrate) {
                    if (stream.bitrate > chM.bitrate)  {
                        bitrate = Math.floor(stream.bitrate);
                    }
                    else {
                        bitrate = chM.bitrate;
                    }
                }
                else if (chM.bitrate > 0) {
                    bitrate = chM.bitrate;
                }
                else {
                    bitrate = count++;
                }


                while(F4F.HDS.getMediaByKey(bitrate)) {
                    bitrate++;
                }

                let mediaEntry = {};                                                
                mediaEntry.baseUrl = baseUrl;
                mediaEntry.url = stream.url.replace('/ /', '%20');
                
                F4F.HDS.setMediaAtKey(bitrate, mediaEntry);                

                if (isRtmpUrl(mediaEntry.baseUrl) || isRtmpUrl(mediaEntry.url)) {
                    throw new Error("Provided manifest is not a valid HDS manifest");
                }

                const idx = mediaEntry.url.indexOf('?');
                if (idx !== -1) {
                    mediaEntry.queryString = mediaEntry.url.substr(idx);
                    mediaEntry.url = mediaEntry.url.substr(0, idx);     
                }
                else {
                    mediaEntry.queryString = F4F.HDS.getAuth();
                }



                let bootstrap = [];
                let btById;
                
                if (stream.bootstrapInfoId) {
                   btById = $(manifestXml).find("bootstrapInfo#" + stream.bootstrapInfoId);
                }
                else {
                    btById = $(manifestXml).find("bootstrapInfo");
                }

                if (btById.length > 0) {

                    let o = {};
                    o.attributes = {};
                    o.attributes.profile = btById[0].getAttribute('profile');
                    o.attributes.id = btById[0].getAttribute('id');
                    o.val = btById[0].innerHTML;
                    bootstrap.push(o);
                }


                if (bootstrap.length > 0) {
                    if (bootstrap[0].url){
                        mediaEntry.bootstrapUrl = absoluteUrl(mediaEntry.baseUrl, utils.getString(bootstrap[0].url));
                        if (mediaEntry.bootstrapUrl.indexOf('?') === -1) {
                            mediaEntry.bootstrapUrl += F4F.HDS.getAuth();
                        }

                    }
                    else {
                        const valToDecode = utils.getString(bootstrap[0].val);
                        mediaEntry.bootstrap = utils.base64_decode(valToDecode);
                    }

                    if (stream.metadata) {
                        const trimmed = stream.metadata.trim();
                        mediaEntry.metadata = utils.base64_decode(trimmed);
                    }
                    else {
                        mediaEntry.metadata = '';
                    }

                }                                                 
            });
        });

        
        if (F4F.HDS.getMediaLength() === 0)
            throw new Error('No media entry found');
        
        // sort qualities from higher to worse
        F4F.HDS.sortMediaDesc();
               
    };
    
    
    var getSegmentFromFragment = function(fragNum) {
        
        const segTable = F4F.HDS.getSegTable();
        const fragTable = F4F.HDS.getFragTable();
        
        let firstSegment = F4F.HDS.getFirstElementsObject(segTable);
        let lastSegment = F4F.HDS.getLastElementsObject(segTable);
        
        let firstFragment = F4F.HDS.getFirstElementsObject(fragTable);
        //let lastFragment = HDS.getLastElementsObject(fragTable);

        if (segTable.length == 1) {
            return firstSegment.firstSegment;
        }
        else {
            let prev  = firstSegment.firstSegment;
            let start = firstFragment.firstFragment;
            for (let i = firstSegment.firstSegment; i <= lastSegment.firstSegment; i++) {
                let seg;
                if (segTable[i])                    
                    seg = segTable[i];
                else
                    seg = prev;
                let end = start + seg.fragmentsPerSegment;
                if ((fragNum >= start) && (fragNum < end))
                    return i;
                prev  = seg;
                start = end;
            }
        }
        return lastSegment.firstSegment;
    };
    
    
    var removeExtension = function(outFile) {
        const reg = new RegExp('\\.\\w{1,4}$', 'gi');
        const m = reg.exec(outFile);
        if (m) {  
            const len = m[0].length;
            outFile = outFile.slice(0, -len);
            return outFile;
        }
        return outFile;
    };
    
    
    var verifyFragment = function(frag, fragLen) {
        
        
        const temp = {};
        temp.frag = frag;
        temp.bool = false;
        
        //let fragPos = 0;
          
        const readBoxObj = {};
        readBoxObj.pos = 0;
        
        // fixing the boxSize before processing the fragment
        while (readBoxObj.pos < fragLen) {          
                        
            //readBoxHeader(frag, readBoxObj);
            readBoxHeaderArray(frag, readBoxObj);
            if (readBoxObj.boxType == "mdat") {                
                
                  //const len = (frag.substr(readBoxObj.pos, readBoxObj.boxSize)).length;
                const len = frag.length - readBoxObj.pos;
                if (readBoxObj.boxSize && (len == readBoxObj.boxSize)) {
                    temp.bool = true;
                    return temp;
                }
                else {                      
                    readBoxObj.boxSize = fragLen - readBoxObj.pos;
                    writeBoxSize(temp.frag, readBoxObj.pos, readBoxObj.boxType, readBoxObj.boxSize);
                    temp.bool = true;
                    return temp;
                }
            }
            
            readBoxObj.pos += readBoxObj.boxSize;
        }
        
        return temp;
    };
    
    
    var decodeFragment = function(frag, options, fragNum) {
        
        
        //$ad       = null; AKAMAI DECRYPTOR NOT REALIZED SO FAR        
        
        let flvFile = null;
        let flvWrite = true;
        
        let debug = F4F.HDS.getDebug();
        if (F4F.HDS.getDecoderTest())
            debug = false;
        
        let flvData  = "";
        let flvTag   = "";
        let fragPos  = 0;
        let packetTS = 0;        
        
        if (!verifyFragment(frag, frag.length)) {            
            console.log("Skipping fragment number " + fragNum);
            return false;
        }

        
        const obj = {};
        obj.pos = fragPos;
        
        // length of the fragment
        let fragLen = frag.length;
        
        while (obj.pos < fragLen) {
            readBoxHeaderArray(frag, obj);
            if (obj.boxType == "mdat") {
                fragLen = obj.pos + obj.boxSize;
                break;
            }
            obj.pos += obj.boxSize;
        }   
        
        
         /** Initialize Akamai decryptor               AKAMAI DECRYPTOR NOT REALIZED SO FAR  
          $ad->debug         = $this->debug;
          $ad->decryptorTest = $this->decoderTest;
          $ad->InitDecryptor();**/
        
        // slice off the metadata info from the fragment leaving only the data
        const slicedTypedArray = frag.slice(obj.pos);
        F4F.HDS.insertToFragsArray(fragNum, slicedTypedArray);
                
        while (obj.pos < fragLen) {
           
            let packetType = utils.readByteArray(frag, obj.pos);           
            let packetSize = utils.readInt24Array(frag, obj.pos + 1);
            let packetTS = utils.readInt24Array(frag, obj.pos + 4);
            packetTS = packetTS | (utils.readByteArray(frag, obj.pos + 7) << 24);
            
            if (packetTS & 0x80000000)
                packetTS &= 0x7FFFFFFF;
            
            const totalTagLen = F4F.HDS.getTagHeaderLen() + packetSize + F4F.HDS.getPrevTagSize();
            
            //let tagHeader = frag.substr(obj.pos, F4F.HDS.getTagHeaderLen());
            let tagHeader = utils.getStringFromCharCode(frag, obj.pos, F4F.HDS.getTagHeaderLen());
            
            //const tagData = frag.substr(obj.pos + F4F.HDS.getTagHeaderLen(), packetSize);
            const tagData = utils.getStringFromCharCode(frag, obj.pos + F4F.HDS.getTagHeaderLen(), packetSize);
                        
            // Remove Akamai encryption             AKAMAI DECRYPTOR NOT REALIZED SO FAR  
            
//              if (($packetType == AKAMAI_ENC_AUDIO) or ($packetType == AKAMAI_ENC_VIDEO))
//                {
//                  $opt['auth']    = $this->media['queryString'];
//                  $opt['baseUrl'] = $this->baseUrl;
//                  $tagData        = $ad->Decrypt($tagData, 0, $opt);
//                  $packetType     = ($packetType == AKAMAI_ENC_AUDIO ? AUDIO : VIDEO);
//                  $packetSize     = strlen($tagData);
//                  WriteByte($tagHeader, 0, $packetType);
//                  WriteInt24($tagHeader, 1, $packetSize);
//                  $this->sessionID = $ad->sessionID;
//                }    
            
            
            // Try to fix the odd timestamps and make them zero based
            const currentTS = packetTS;
            let lastTS = F4F.HDS.getPrevVideoTS() >= 
                F4F.HDS.getPrevAudioTS() ? F4F.HDS.getPrevVideoTS() : F4F.HDS.getPrevAudioTS();
            
            const fixedTS = lastTS + F4F.CONSTANTS.FRAMEFIX_STEP;
            
           
            if ((F4F.HDS.getBaseTS() == F4F.CONSTANTS.INVALID_TIMESTAMP) && 
                ((packetType == F4F.CONSTANTS.AUDIO) || (packetType == F4F.CONSTANTS.VIDEO))) {
                  F4F.HDS.setBaseTS(packetTS);
            }     
            
            if ((F4F.HDS.getBaseTS() > 1000) && (packetTS >= F4F.HDS.getBaseTS())) {
                  packetTS -= F4F.HDS.getBaseTS();
            }
            
            
            if (lastTS != F4F.CONSTANTS.INVALID_TIMESTAMP) {
                
                const timeShift = packetTS - lastTS;
                if (timeShift > F4F.HDS.getFixWindow()) {
                    
                   // console.log('Timestamp gap detected: PacketTS=' + packetTS + " LastTS=" + lastTS + " Timeshift=" + timeShift);
                    
                    let bts = F4F.HDS.getBaseTS();
                    if (bts < packetTS) {
                        bts += timeShift - F4F.CONSTANTS.FRAMEFIX_STEP;
                        F4F.HDS.setBaseTS(bts);
                    }
                    else {
                        F4F.HDS.setBaseTS(timeShift - F4F.CONSTANTS.FRAMEFIX_STEP);
                    }
                    
                    packetTS = fixedTS;
                }
                
                else {
                    
                    lastTS = packetType == F4F.CONSTANTS.VIDEO ? F4F.HDS.getPrevVideoTS() : F4F.HDS.getPrevAudioTS();
                    if (packetTS < (lastTS - F4F.HDS.getFixWindow())) {
                        
                        if ((F4F.HDS.getNegTS() != F4F.CONSTANTS.INVALID_TIMESTAMP) && 
                            ((packetTS + F4F.HDS.getNegTS()) < (lastTS - F4F.HDS.getFixWindow()))) {
                            
                            F4F.HDS.setNegTS(F4F.CONSTANTS.INVALID_TIMESTAMP);
                        }
                        
                        if (F4F.HDS.getNegTS() == F4F.CONSTANTS.INVALID_TIMESTAMP) {
                            
                            F4F.HDS.setNegTS(fixedTS - packetTS);
                           // console.log('Negative timestamp detected: PacketTS=' + packetTS + " LastTS=" + lastTS + " NegativeTS=" + F4F.HDS.getNegTS());
                            packetTS = fixedTS;
                            
                        }
                        else {
                            if ((packetTS + F4F.HDS.getNegTS()) <= (lastTS + F4F.HDS.getFixWindow())) {
                                packetTS += F4F.HDS.getNegTS();
                            }
                            else {
                                F4F.HDS.setNegTS(fixedTS - packetTS);
                               // console.log("Negative timestamp override: PacketTS=" + packetTS + " LastTS=" + lastTS + " NegativeTS=" + F4F.HDS.getNegTS());
                                packetTS = fixedTS;
                            }
                        }
                    }
                }
            }
            
            if (packetTS != currentTS) {
                
//                const flvTSObj = {};
//                flvTSObj.frag = tagHeader;
                tagHeader = writeFlvTimestamp(tagHeader, 0, packetTS);
            }
            
            
            
            
            switch(packetType) {
            
                case F4F.CONSTANTS.AUDIO:
                    
                    
                    if (packetTS > F4F.HDS.getPrevAudioTS() - F4F.HDS.getFixWindow()) {
                        
                        const frameInfo = utils.readByte(tagData, 0);
                        const codecID = (frameInfo & 0xF0) >> 4;
                        const AAC_PacketType = utils.readByte(tagData, 1);
                        
                        if (codecID == F4F.CONSTANTS.CODEC_ID_AAC) {
                            
                            
                            if (AAC_PacketType == F4F.CONSTANTS.AAC_SEQUENCE_HEADER) {
                                
                                if (F4F.HDS.getAAC_HeaderWritten()) {
                                //    console.log("Skipping AAC sequence header, " + "AUDIO, " + packetTS + ', ' + F4F.HDS.getPrevAudioTS() + ', ' + packetSize);
                                    break;                                    
                                }
                                else {
                                    console.log("Writing AAC sequence header");
                                    F4F.HDS.setAAC_HeaderWritten(true);
                                }
                            }
                            else if (!F4F.HDS.getAAC_HeaderWritten()) {
                             //   console.log("Discarding audio packet received before AAC sequence header, " + "AUDIO, " + packetTS + ', ' + F4F.HDS.getPrevAudioTS() + ', ' + packetSize);
                                break;
                            }
                        }             
                        
                        if (packetSize > 0) {
                            
                            // Check for packets with non-monotonic audio timestamps and fix them
                            if (!((codecID == F4F.CONSTANTS.CODEC_ID_AAC) && ((AAC_PacketType == F4F.CONSTANTS.AAC_SEQUENCE_HEADER) || F4F.HDS.getPrevAAC_Header()))) {
                                
                                if ((F4F.HDS.getPrevAudioTS() != F4F.CONSTANTS.INVALID_TIMESTAMP) && (packetTS <= F4F.HDS.getPrevAudioTS())) {
                                    
                                  //  console.log("Fixing audio timestamp, " + "AUDIO, " + packetTS + ', ' + F4F.HDS.getPrevAudioTS() + ', ' + packetSize);
                                    packetTS += (F4F.CONSTANTS.FRAMEFIX_STEP / 5) + (F4F.HDS.getPrevAudioTS() - packetTS);
                                    
//                                    const flvTSObj = {};
//                                    flvTSObj.frag = tagHeader;
                                    tagHeader = writeFlvTimestamp(tagHeader, 0, packetTS);
                                }
                            } 
                            
                            flvTag = tagHeader + tagData;
                            let flvTagLen = flvTag.length;
                                                        
                            flvTag = utils.writeInt32(flvTag, flvTagLen, flvTagLen);
                            flvTagLen = flvTag.length;
                            
                            if (flvWrite && flvFile) { //&& is_resource($flvFile))
                                
                               // F4F.HDS.setPAudioTagPos(F4F.HDS.getFLVCurrentPos());
                              //  F4F.HDS.appendToFLV(/*flvTag*/flvData);
//                                
//                                  $status             = fwrite($flvFile, $flvTag, $flvTagLen);
//                                  if (!$status)
//                                      LogError("Failed to write flv data to file");
                                  //if ($debug)
                             //   console.log("AUDIO, " + packetTS + ', ' + F4F.HDS.getPrevAudioTS() + ', ' + packetSize + ', ' + F4F.HDS.getPAudioTagPos());
                            }
                            else {
                                flvData += flvTag;
                          //      console.log("AUDIO, " + packetTS + ', ' + F4F.HDS.getPrevAudioTS() + ', ' + packetSize);
                            }
                            
                            if ((codecID == F4F.CONSTANTS.CODEC_ID_AAC) && (AAC_PacketType == F4F.CONSTANTS.AAC_SEQUENCE_HEADER))
                                  F4F.HDS.setPrevAAC_Header(true);
                              else
                                  F4F.HDS.setPrevAAC_Header(false);
                            
                            F4F.HDS.setPrevAudioTS(packetTS);
                            F4F.HDS.setPAudioTagLen(flvTagLen);
                        }
                        else {
                            console.log("Skipping small sized audio packet, " + "AUDIO, " + packetTS + ', ' + F4F.HDS.getPrevAudioTS() + ', ' + packetSize);
                        }
                    }
                    else {
                        console.log("Skipping audio packet in fragment " + fragNum + ", AUDIO, " + packetTS + ', ' + F4F.HDS.getPrevAudioTS() + ', ' + packetSize);
                    }
                    
                    if (!F4F.HDS.getAudio())
                          F4F.HDS.setAudio(true);
                                        
                    break;
                    
                    
                case F4F.CONSTANTS.VIDEO:
                    
                    if (packetTS > F4F.HDS.getPrevVideoTS() - F4F.HDS.getFixWindow()) {
                        
                        
                        const frameInfo = utils.readByte(tagData, 0);
                        const frameType = (frameInfo & 0xF0) >> 4;
                        const codecID   = frameInfo & 0x0F;
                        
                        if (frameType == F4F.CONSTANTS.FRAME_TYPE_INFO) {                            
                          //    console.log("Skipping video info frame, " + "VIDEO, " + packetTS + ', ' + F4F.HDS.getPrevVideoTS() + ', ' + packetSize);
                              break;
                        }
                        
                        
                        let AVC_PacketType;
                        
                        if (codecID == F4F.CONSTANTS.CODEC_ID_AVC) {
                            
                            AVC_PacketType = utils.readByte(tagData, 1);
                            if (AVC_PacketType == F4F.CONSTANTS.AVC_SEQUENCE_HEADER) {
                                
                                if (F4F.HDS.getAVC_HeaderWritten()) {                                    
                                 //   console.log("Skipping AVC sequence header, " + "VIDEO, " + packetTS + ', ' + F4F.HDS.getPrevVideoTS() + ', ' + packetSize);
                                    break;
                                }
                                else {
                                    console.log("Writing AVC sequence header");
                                    F4F.HDS.setAVC_HeaderWritten(true);
                                }
                            }
                            else if (!F4F.HDS.getAVC_HeaderWritten()) {
                                console.log("Discarding video packet received before AVC sequence header, " + "VIDEO, " +  packetTS + ', ' + F4F.HDS.getPrevVideoTS() + ', ' + packetSize);
                                break;
                            }
                        }
                        
                        
                        if (packetSize > 0) {
                            
                            let pts = packetTS;
                            
                            if ((codecID == F4F.CONSTANTS.CODEC_ID_AVC) && (AVC_PacketType == F4F.CONSTANTS.AVC_NALU)) {
                                
                                let cts = utils.readInt24(tagData, 2);
                                cts = (cts + 0xff800000) ^ 0xff800000;
                                pts = packetTS + cts;
                                //if (cts != 0)
                                 //   console.log("DTS: " + packetTS + ', CTS: ' + cts + ', PTS: ' + pts);
                            }
                            
                            
                            // Check for packets with non-monotonic video timestamps and fix them
                            if (!((codecID == F4F.CONSTANTS.CODEC_ID_AVC) && ((AVC_PacketType == F4F.CONSTANTS.AVC_SEQUENCE_HEADER) || (AVC_PacketType == F4F.CONSTANTS.AVC_SEQUENCE_END) || F4F.HDS.getPrevAVC_Header()))) {
                                
                                if ((F4F.HDS.getPrevVideoTS() != F4F.CONSTANTS.INVALID_TIMESTAMP) && (packetTS <= F4F.HDS.getPrevVideoTS())) {
                                    
                                    
                                //    console.log("Fixing video timestamp, " + "VIDEO, " + packetTS + ', ' + F4F.HDS.getPrevVideoTS() + ', ' + packetSize);
                                    
                                    packetTS += (F4F.CONSTANTS.FRAMEFIX_STEP / 5) + (F4F.HDS.getPrevVideoTS() - packetTS);
                                    tagHeader = writeFlvTimestamp(tagHeader, 0, packetTS);   
                                }
                            }
                            
                            flvTag = tagHeader + tagData;
                            let flvTagLen = flvTag.length;
                            flvTag = utils.writeInt32(flvTag, flvTagLen, flvTagLen);
                            flvTagLen = flvTag.length;
                                                        
                            if (flvWrite && flvFile) { //and is_resource($flvFile))
                                
//                                F4F.HDS.setPVideoTagPos(F4F.HDS.getFLVCurrentPos());
//                                F4F.HDS.appendToFLV(flvTag);
                           //     console.log("VIDEO, " + packetTS + ', ' + F4F.HDS.getPrevVideoTS() + ', ' + packetSize + ', ' + F4F.HDS.getPVideoTagPos());
//                                
//                                  $status             = fwrite($flvFile, $flvTag, $flvTagLen);
//                                  if (!$status)
//                                      LogError("Failed to write flv data to file");
//                                  if ($debug)
//                                      LogDebug(sprintf($this->format . "%-16s", "VIDEO", $packetTS, $this->prevVideoTS, $packetSize, $this->pVideoTagPos));
                            }
                            else {  
                                flvData += flvTag;
                          //      console.log("VIDEO, " + packetTS + ', ' + F4F.HDS.getPrevVideoTS() + ', ' + packetSize);
                                
                            }
                            
                            if ((codecID == F4F.CONSTANTS.CODEC_ID_AVC) && (AVC_PacketType == F4F.CONSTANTS.AVC_SEQUENCE_HEADER))
                                F4F.HDS.setPrevAVC_Header(true);
                            else
                                F4F.HDS.setPrevAVC_Header(false);
                            
                            F4F.HDS.setPrevVideoTS(packetTS);
                            F4F.HDS.setPVideoTagLen(flvTagLen);
                        }
                        else {
                            console.log("Skipping small sized video packet, " + "VIDEO, " + packetTS + ', ' + F4F.HDS.getPrevVideoTS() + packetSize);
                        }
                    }
                    else {
                        console.log("Skipping video packet in fragment " + fragNum + ", VIDEO, " + packetTS + ', ' + F4F.HDS.getPrevVideoTS() + ', ' + packetSize);
                    }
                    
                    if (!F4F.HDS.getVideo())
                        F4F.HDS.setVideo(true);
                    
                    break;
                    
                    
                case F4F.CONSTANTS.SCRIPT_DATA:
                    break;
                    
                default:
                    
                    if ((packetType == 40) || (packetType == 41)) {
                        console.log("This stream is encrypted with FlashAccess DRM. Decryption of such streams isn't currently possible with this script.");
                    }
                    else {
                        console.log("Unknown packet type " + packetType + " encountered! Unable to process fragment " + fragNum);
                        break;                        
                    }
            }
            
            obj.pos += totalTagLen;
        }
        
        return flvData; 

    };    
    
    
    var writeFlvHeader = function(audio, video) {
        audio = audio || true;
        video = video || true;        
       
        let flvHeader = utils.unhexlify("464c5601050000000900000000");       
        let flvHeaderLen = flvHeader.length;
        
        // Set proper Audio/Video marker
        flvHeader = utils.writeByte(flvHeader, 4, audio << 2 | video);
        return flvHeader;
    };
    
    
    var writeMetadata = function(flv) {
        
        const mediaMetaData = F4F.HDS.getMediaValueByName('metadata');
        if (F4F.HDS.getMediaArray().length > 0 && mediaMetaData) {
            
            const metadataSize = mediaMetaData.length;
            let metadata = "";
            
            metadata = utils.writeByte(metadata, 0, F4F.CONSTANTS.SCRIPT_DATA);
            metadata = utils.writeInt24(metadata, 1, metadataSize);
            metadata = utils.writeInt24(metadata, 4, 0);
            metadata = utils.writeInt32(metadata, 7, 0);
            
            metadata = metadata + mediaMetaData;

            metadata = utils.writeByte(metadata, F4F.HDS.getTagHeaderLen() + metadataSize - 1, 0x09);
            metadata = utils.writeInt32(metadata, F4F.HDS.getTagHeaderLen() + metadataSize, F4F.HDS.getTagHeaderLen() + metadataSize);
            
            return metadata;
        }  
        return false;
    };
    
   
    var writeFragment = function(frag, options, fragNum) {                
        
        if (!options.flvFile) {            
           
            F4F.HDS.setDecoderTest(true);            
            F4F.HDS.initDecoder();
            // write header
            options.flvFile = writeFlvHeader(F4F.HDS.getAudio(), F4F.HDS.getVideo());
            F4F.HDS.appendHeaderAndMetaData(options.flvFile);
            
            //write metadata
            if (F4F.HDS.getMetaData()) {
                const mData = writeMetadata(options.flvFile);
                if (mData != false) {
                    F4F.HDS.appendHeaderAndMetaData(mData);
                }
            }
        }
        
        // decode and write fragment data
        const fragData = decodeFragment(frag, options, fragNum);        
        
    };
    
    
    var saveToDisk = function(callback) {
        
        function mergeTypedArrays(a, b) {
            // Checks for truthy values on both arrays
            if(!a && !b) throw 'Please specify valid arguments for parameters a and b.';  

            // Checks for truthy values or empty arrays on each argument
            // to avoid the unnecessary construction of a new array and
            // the type comparison
            if(!b || b.length === 0) return a;
            if(!a || a.length === 0) return b;

            // Make sure that both typed arrays are of the same type
            if(Object.prototype.toString.call(a) !== Object.prototype.toString.call(b))
                throw 'The types of the two arguments passed for parameters a and b do not match.';

            var c = new a.constructor(a.length + b.length);
            c.set(a);
            c.set(b, a.length);

            return c;
        }

        const headerStr = F4F.HDS.getHeaderAndMetaData();
        var headerArr = new Uint8Array(headerStr.length);
        headerStr.split("").forEach(function(a,b){
            headerArr[b]=a.charCodeAt();
        });

        let dataBuffer = new Uint8Array(0);
        dataBuffer = mergeTypedArrays(headerArr, dataBuffer);

        for(let i = 0; i < F4F.HDS.getFragsArray().length; i++) {
            let curItem = F4F.HDS.getFragsArray()[i];
            if(curItem) {
                dataBuffer =  mergeTypedArrays(dataBuffer, curItem);
            }
        }


        callback();
        download(dataBuffer, F4F.HDS.getBaseFilename(), "video/x-msvideo");

    };
  
    
    adobe.downloadFragments = function(obj, clickedLink) {
        
        try {                        
                       
            let options = {};            
            let start = 0;
            
            let key = clickedLink[0];
                        
             // Parse initial bootstrap info        
            F4F.HDS.setBaseURL(clickedLink[1].baseUrl);
            const bs = clickedLink[1].bootstrapUrl;
            if (bs) {
                bootstrapUrl = bs;
            }
            else {

                const bootstrapInfo = clickedLink[1].bootstrap;

                const bootstrapObj = readBoxHeader(bootstrapInfo);
                if (bootstrapObj.boxType == "abst") {   
                   parseBootstrapBox(bootstrapInfo, bootstrapObj.pos);
                }
                else { 
                    throw new Error("Failed to parse bootstrap info");
                }                 
            }
            
            const segTable = F4F.HDS.getSegTable();
            const fragTable = F4F.HDS.getFragTable();


            
            let segNum  = F4F.HDS.getSegStart();
            let fragNum = F4F.HDS.getFragStart();
            if (start) {
                segNum = getSegmentFromFragment(start);
                fragNum = start - 1;
                F4F.HDS.setSegStart(segNum);
                F4F.HDS.setFragStart(fragNum);
            }

            F4F.HDS.setLastFrag(fragNum);
            let firstFragment = F4F.HDS.getFirstElementsObject(fragTable);
//            console.log("Fragments Total: " + $this->fragCount, $firstFragment['firstFragment'], $fragNum + 1, $this->parallel));


            // Extract baseFilename
            // media array contains 1 item, which is a 2-items array [0: quality, 1: object with needed properties]
           // let media = F4F.HDS.getMediaArray()[0][1];

            F4F.HDS.setBaseFilename(/*media.url*/clickedLink[1].url);
            let curBaseName = F4F.HDS.getBaseFilename();

            if (curBaseName.slice(-1) === '/') {
                F4F.HDS.setBaseFilename(curBaseName.slice(0, -1));
                curBaseName = F4F.HDS.getBaseFilename();
            }


            F4F.HDS.setBaseFilename(removeExtension(curBaseName));
            curBaseName = F4F.HDS.getBaseFilename();

            const lastSlash = curBaseName.lastIndexOf('/');
            if (lastSlash !== -1) {
                F4F.HDS.setBaseFilename(curBaseName.substr(lastSlash + 1)); 
                curBaseName = F4F.HDS.getBaseFilename();
            }

     

            if (fragNum >= F4F.HDS.getFragCount())
                throw new Error("No fragment available for downloading");
            
            

            F4F.HDS.setFragURL(absoluteUrl(F4F.HDS.getBaseURL(), /*media*/clickedLink[1].url));
            

            fragNum++;
            let xhr = new Array(F4F.HDS.getFragCount()), successfulRequests = 0;
            
            // update UI
            updateHTML.showProgressWindow(F4F.HDS.getFragCount());
          
            
            for (let i = fragNum; i <= F4F.HDS.getFragCount(); i++) {           
                
                (function(i) {
                    
                    segNum = getSegmentFromFragment(i);
                    let fragUrl = F4F.HDS.getFragURL() + 'Seg' + segNum + '-Frag' + i;

                    xhr[i] = new XMLHttpRequest();
                    
                    xhr[i].onreadystatechange = function() {
                        
                        if (xhr[i].readyState == 4) {
                            
                            if (xhr[i].status == 200) {
                                
                                const arraybuffer = new Uint8Array(xhr[i].response);                             
                                writeFragment(arraybuffer, options, i);

                                successfulRequests++;                                
                                //updateHTML.displayDownloadProgress(i);
                                if (successfulRequests == F4F.HDS.getFragCount()) {    
                                    saveToDisk(updateHTML.displayAllDone);
                                }
                            }                        
                            // in the end, download all that exists
                            else {
                                if (i == F4F.HDS.getFragCount()) {                                    
                                    saveToDisk();
                                }
                                else {
                                   // updateHTML.displayError();
                                }
                            }
                        }
                    };
                    // update UI
                    xhr[i].onprogress = function(e) {
                        if (e.lengthComputable) {
                            updateHTML.initProgressBar(e.total, e.loaded, i);
                        }
                    };
                    xhr[i].onloadstart = function(e) {
                        updateHTML.startProgressBar(e, i);
                    };
                    xhr[i].onloadend = function(e) {
                        updateHTML.endProgressBar(e.loaded, i);
                    };
                    xhr[i].open("GET", fragUrl);
                    xhr[i].responseType = "arraybuffer";
                    xhr[i].send();
                })(i);
                
            }
         
        }
        catch(e){
            debugger;
        }
        
    };
        
    
    
    
})(this.adobe = {});