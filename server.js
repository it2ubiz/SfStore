var express = require('express'); 
var app = express(); 
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
mongoose.connect('mongodb://127.0.0.1/sfstore');
var conn = mongoose.connection;
var multer = require('multer');
var GridFsStorage = require('multer-gridfs-storage');
var Grid = require('gridfs-stream');
Grid.mongo = mongoose.mongo;
var gfs = Grid(conn.db);
const ObjectId = mongoose.Types.ObjectId;


//FOR DEBUG ONLY - Comment in prod
app.use(function(req, res, next) {
    res.setHeader("Access-Control-Allow-Methods", "POST, PUT, OPTIONS, DELETE, GET");
    res.header("Access-Control-Allow-Origin", "http://localhost:3000");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    res.header("Access-Control-Allow-Credentials", true);
    next();
});

app.use(bodyParser.json());


function authenticationMiddleware () {
    return function (req, res, next) {
        if (req.isAuthenticated()) {
            return next()
        }

        res.status(404).json({
            responseCode: 1,
            responseMessage: "Not authorized"
        });        
    }
}


var storage = GridFsStorage({
    gfs : gfs,
    filename: function (req, file, callback) {
        var datetimestamp = Date.now();
        callback(null, file.fieldname + '-' + datetimestamp + '.' + file.originalname.split('.')[file.originalname.split('.').length -1]);
    },    
    metadata: function(req, file, callback) {
        callback(null, { originalname: file.originalname });
    },
    root: 'scfiles' 
});

var upload = multer({
    storage: storage
}).single('file');



app.post('/fput'/*, authenticationMiddleware()*/,function(req, res) {    
    upload(req,res,function(err){       
        if(err){
             res.json({error_code:1,err_desc:err});
             return;
        }      
        console.log(req.file);
        res.json({error_code:0,file_id:req.file.id});       
    });
});

app.get('/fget/:id'/*, authenticationMiddleware()*/, function(req, res){
    gfs.collection('scfiles');
    var fid=new ObjectId(req.params.id);
    gfs.files.find({_id:fid}).toArray(function(err, files){
        if(!files || files.length === 0){
            return res.status(404).json({
                responseCode: 1,
                responseMessage: "error"
            });
        }
        var readstream = gfs.createReadStream({
            filename: files[0].filename,
            root: "scfiles"
        });        
        res.set('Content-Type', files[0].contentType)        
        return readstream.pipe(res);
    });
});

app.listen('3000', function(){
    console.log('running on 3000...');
});