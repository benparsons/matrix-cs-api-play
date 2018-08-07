var express = require('express');
var app = express();
app.use(express.json());
const sqlite3 = require('sqlite3').verbose();

db = new sqlite3.Database('./events.db', sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
    if (err) { console.log(err); } 
    else { console.log("Connected to DB"); }
  });

app.get("/get-next-event", function(req, res) {
    console.log("getting");
    var sql = `SELECT * FROM events
    WHERE sentiment_score is null AND type = 'm.room.message'
    ORDER BY origin_server_ts DESC
    LIMIT 1`;
    db.get(sql, function(err, value) {
        res.send(JSON.stringify(value, null, 2));
    });
});

app.get("/:file", function(req, res) {
    res.sendFile("./" + req.params.file, { root: __dirname });
});

app.post("/update-event-score", function(req, res) {
    console.log(req.body);
    var post = req.body;
    if (post.event_id && post.score) {
        var sql = `UPDATE events SET sentiment_score = ${post.score} WHERE event_id = '${post.event_id}'`;
        console.log(sql);
        db.run(sql, function(error) {
            if (error) {
                res.write(JSON.stringify({error: error}));
                res.end();
            } else {                        
                res.write(JSON.stringify({success: "updated item"}));
                res.end();
            }
        });
    } else {
        res.write(JSON.stringify({error: "post object needs event_id and score"}));
        res.end();
    }
});

var port = 3500;
app.listen(port, () => {
    console.log(`Listening on port ${port}`);
});