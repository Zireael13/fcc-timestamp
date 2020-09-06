// server.js
// where your node app starts

// init project
var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var moment = require('moment');

// enable CORS (https://en.wikipedia.org/wiki/Cross-origin_resource_sharing)
// so that your API is remotely testable by FCC 
var cors = require('cors');
app.use(cors({optionSuccessStatus: 200}));  // some legacy browsers choke on 204


app.use(bodyParser.urlencoded({extended: false}));


// http://expressjs.com/en/starter/static-files.html
app.use(express.static('public'));

// http://expressjs.com/en/starter/basic-routing.html
app.get("/", function (req, res) {
  res.sendFile(__dirname + '/views/index.html');
});


// your first API endpoint... 
app.get("/api/hello", function (req, res) {
  res.json({greeting: 'hello API'});
});

app.get('/api/timestamp/:timestamp', (req, res) => {

  let date;

  console.log(req.params.timestamp);

  if(!req.params) {
    date = new Date();
  } else if(/\d{5,}/.test(req.params.timestamp)) {
    const dateInt = parseInt(req.params.timestamp);
    date = new Date(dateInt);
  } else {
    date = new Date(req.params.timestamp);
  }

  console.log(date);

  

  res.send({unix: date.getTime(), utc: date.toUTCString() });

 });

 
app.get('/api/timestamp/', (req, res) => {

  date = new Date();

  console.log(date);

  res.send({unix: date.getTime(), utc: date.toUTCString() });

 });



// listen for requests :)
var listener = app.listen(process.env.PORT || 5000, function () {
  console.log('Your app is listening on port ' + listener.address().port);
});