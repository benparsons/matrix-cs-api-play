var config = require('./config.json');
const request = require('request');
var fs = require('fs');
var http = require('http');


var access_token = fs.readFileSync('access_token', 'utf-8');
var server_cs_path = 'https://' + config.server + '/_matrix/client/';
var roomIds = [];
roomIds["#riot:matrix.org"] = '!DgvjtOljKujDBrxyHk:matrix.org';
roomIds["#twim:matrix.org"] = '!FPUfgzXYWTKgIrwKxW:matrix.org';

var limitCount = 100;

var moment = require('moment');
const sqlite3 = require('sqlite3').verbose();
var sqlGenerator = require('./sql-generator.js');

db = new sqlite3.Database('./events.db', sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
    if (err) { console.log(err); } 
    else { console.log("Connected to DB"); }
  });

if (access_token.length === 0) {
    login();
}
//sync();
function login() {
    console.log("==============");
    console.log("post_login");
    var options = {
        url: server_cs_path + 'r0/login',
        json: true,
        body: {"type":"m.login.password", "user": config.username, "password":config.password}
    };
    request.post(options, (err, res, body) => {
        if (err) { return console.log(err); }
        console.log(body);
        access_token = body.access_token;
        fs.writeFileSync('access_token', access_token);
        //get_room_id_by_alias();
    });
}

function getRequest(endpoint, callback) {
    var url = server_cs_path + 'r0' + endpoint;
    if (url.indexOf('?') === -1) { url = `${url}?access_token=${access_token}`; }
    else { url = `${url}&access_token=${access_token}`; }

    //console.log("requesting: " + url);
    request( {url: url,  json: true },(err, res, body) => {
        callback(err, body);
    });
}

function get_room_id_by_alias() {
    getRequest("/directory/room/%23elliptic-supporters:matrix.org", (err, body) => {
        if (err) { return console.log(err); }
        console.log(body.room_id);
        //get_room_members(body.room_id);
    });
}

function sync() {
    var roomFilter = {
        rooms: [roomIds["#twim:matrix.org"]],
        "timeline":{"limit":limitCount},
        "state": {"not_types": ["*"]},
    };
    var filter = {"room":roomFilter, account_data:{not_types:['*']}};
    getRequest('/sync?filter=' + JSON.stringify(filter, null, 0), (err, body) => {
        if (err) { return console.log(err); }

        var output = body;
        output = body.rooms.join[roomIds["#twim:matrix.org"]].timeline;
        output.events.forEach(event => {
            event.room_id = roomIds["#twim:matrix.org"];
            printAndStoreRoomEvent(event);
        });
        walkBackwardsGetRoomMessages(roomIds["#twim:matrix.org"], output.prev_batch);
    });
}

var chunks = [];
function walkBackwardsGetRoomMessages(roomId, start) {    
    getRequest(`/rooms/${roomId}/messages?dir=b&from=${start}&limit=${limitCount}`, (err, body) => {
        if (err) { return console.log(err); }
        body.chunk.forEach(event => { printAndStoreRoomEvent(event); });
        walkBackwardsGetRoomMessages(roomId, body.end);
    });
}

function printAndStoreRoomEvent(event) {
    console.log(event.event_id);
    var flattenedEvent = {
        sender: event.sender,
        message: event.content.body,
        type: event.type,
        origin_server_ts: moment(event.origin_server_ts).format(),
        event_id: event.event_id,
        room_id: event.room_id
    };
    var sql = sqlGenerator.insertOrReplaceSql('events', flattenedEvent);
    //console.log(sql);
    db.run(sql);
}

http.createServer(function (req, res) {
    if (req.method === 'GET' && req.url.indexOf("sentiment") !== -1) {

    }
    if (req.method === 'GET') {

    } else if (req.method === 'POST') {
        var body = '';

        req.on('data', function (data) {
            body += data;

            if (body.length > 1e6)
                req.connection.destroy();
        });

        req.on('end', function () {
            var post = JSON.parse(body);
            console.log(post);
            res.writeHead(200, {'Content-Type': 'text/json'});

        });
        
    }
  }).listen(8080);
  