var express = require('express')
var cors = require('cors');
var bodyParser = require('body-parser')
var app = express();
app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json());

var EventEmitter = require('events').EventEmitter
var messageBus = new EventEmitter()

var encrypted_info = {}


app.post('/listen/:listenId', function (req, res) {
  console.log("incoming post");
  var listenId = req.params['listenId'];
  if(!listenId.match(/^[0-9a-z]{20,}$/)){
     res.json({success: false});
     return;
  }
  if(listenId in encrypted_info){
     res.json({success: false});
     return;
  }
  console.log("adding a new id:"+listenId);

  console.log(req.body);
  console.log(req.query);
  var encrypted_string = req.body.enc;
  var ctr = req.body.ctr;
  var hmac = req.body.hmac;
  //var buffer = new Buffer(req.body.enc.data);
  messageBus.emit(listenId, {encrypted_info: encrypted_string, ctr: ctr, hmac: hmac});
  encrypted_info[listenId] = {created: new Date(), encrypted_info: encrypted_string, ctr: ctr, hmac: hmac}
  res.json({success: true});
})

app.get('/listen/:listenId', function(req, res){
    console.log("incoming get id");
    var listenId = req.params['listenId'];
    if(!listenId.match(/^[0-9a-z]{20,}$/)){
        res.json({success: false, error: "Invalid listenId"});
        return;
    }
    console.log("getting a id:"+listenId);
    if(listenId in encrypted_info){
        var info = encrypted_info[listenId]['encrypted_info'];
        var ctr = encrypted_info[listenId]['ctr'];
        var hmac = encrypted_info[listenId]['hmac'];
        res.json({success: true, encrypted_info:info, ctr: ctr, hmac: hmac});
        return;
    }
    var addMessageListener = function(res, listenId){
        messageBus.once(listenId, function(data){
            res.json({success: true, encrypted_info:data.encrypted_info, ctr: data.ctr, hmac: data.hmac});
        })
    }
    addMessageListener(res, listenId);
});

app.listen(80, function () {
  console.log('Example app listening on port 80!')
})

var CronJob = require('cron').CronJob;
new CronJob('0 0 * * * *', function() {

var currentDate = new Date();
    var filtered = Object.keys(encrypted_info).reduce(function (filtered, key) {
        if (currentDate - encrypted_info[key]['created'] < 1000*60*24) filtered[key] = encrypted_info[key];
        return filtered;
    }, {});
    encrypted_info = filtered;

    console.info('cron job completed');


}, null, true, 'America/Los_Angeles');