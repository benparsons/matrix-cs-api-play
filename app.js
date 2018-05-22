var config = require('./config.json');
const request = require('request');
var jp = require('jsonpath');

var server_cs_path = 'https://' + config.server + '/_matrix/client/';
var access_token = '';

post_login();

// useful sanity check: just GET the server versions
function get_server_versions() {
  request({url: server_cs_path + 'versions',  json: true }, (err, res, body) => {
    if (err) { return console.log(err); }
    console.log(body.versions);
  });
}

function post_login() {
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
    get_room_id_by_alias();
  });
  
}

function get_room_id_by_alias() {
  console.log("==============");
  console.log("get_room_id_by_alias");
  request( {url: server_cs_path + 'r0/directory/room/%23twim:matrix.org',  json: true },(err, res, body) => {
    if (err) { return console.log(err); }
    console.log(body.room_id);
    get_room_state(body.room_id);
  });
}

function get_room_state(room_id) {
  console.log("==============");
  console.log("get_room_state");
  var options = {
    url: server_cs_path + "r0/rooms/" + room_id + "/state",
    qs: {access_token: access_token},
    json: true
  }
  request.get(options, (err, res, body) => {
    if (err) { return console.log(err); }
    //console.log(body);
    filter_members(body);
  });
}

function filter_members(state) {
  var filtered_state = jp.query(state, '$[?(@.type=="m.room.aliases")]');
  console.log(filtered_state);
}