const MyBlobBuilder = function() {
    this.parts = [];
    this.dict = {};
};

MyBlobBuilder.prototype.append = function(part, ind) {    
    this.dict[ind] = part;
    this.blob = undefined; 
};

MyBlobBuilder.prototype.getBlob = function(t) {
  if (!this.blob) {
    this.blob = new Blob(this.parts, { type: t });
  }
  return this.blob;
};

MyBlobBuilder.prototype.sort = function() {
    var keys = Object.keys(this.dict);
    keys.sort(function(a, b){return a-b});
    
    for (var i=0; i < keys.length; i++) { 
        var key = keys[i];        
        this.parts.push(this.dict[key]);
    }
};

MyBlobBuilder.prototype.iterate = function() {
    this.parts.forEach(function(x){
       console.log(x);
    });
};