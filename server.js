// server.js
// where your node app starts

// init project
require('dotenv').config();
const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const moment = require('moment');
const useragent = require('express-useragent');
const dns = require('dns');
const mongoose = require('mongoose');
const crypto = require('crypto');

// enable CORS (https://en.wikipedia.org/wiki/Cross-origin_resource_sharing)
// so that your API is remotely testable by FCC 
const cors = require('cors');
const { doesNotMatch } = require('assert');
const { url } = require('inspector');
app.use(cors({optionSuccessStatus: 200}));  // some legacy browsers choke on 204

app.use(useragent.express());

app.use(bodyParser.urlencoded({extended: false}));

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const { Schema } = mongoose;

const urlSchema = new Schema({
  hash: {type: String, required: true},
  url: {type: String, required: true},
});

const shortUrl = mongoose.model('urlSchema', urlSchema);


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

  if(isNaN(date)) {
    res.send({error: "Invalid Date"});
  }

  console.log(date);

  

  res.send({unix: date.getTime(), utc: date.toUTCString() });

 });

 
app.get('/api/timestamp/', (req, res) => {

  date = new Date();

  console.log(date);

  res.send({unix: date.getTime(), utc: date.toUTCString() });

 });


app.get('/api/whoami', (req, res) => {
  const lang = req.headers['accept-language'];
  
  res.send({
    ipaddress: req.ip,
    language: lang,
    software: req.useragent.source
  });


})

const createAndSaveUrl = (inputUrl, done) => {

  const randomHash = crypto.randomBytes(3).toString('hex');
  const newUrl = new shortUrl({
    hash: randomHash,
    url: inputUrl
  });

  newUrl.save((err, urlObj) => {
    if (err) return console.error(err);
    done(null, urlObj);
  })

}

function addhttp(url) {
  if (!/^(?:f|ht)tps?\:\/\//.test(url)) {
      url = "http://" + url;
  }
  return url;
}


app.post('/api/shorturl/new', (req, res) => {
  const inputUrl = req.body.url;
  console.log(inputUrl);

  let validAddress;

  dns.lookup(inputUrl, (err, address, family) => {
    validAddress = address;
    console.log(validAddress);

    if(validAddress === undefined){
      res.send({error: "invalid URL"});
      return;
    }
    
    createAndSaveUrl(inputUrl, (err, urlObj) => {
      res.send({original_url: urlObj.url, short_url: urlObj.hash});
    });
    
  });
})

const findUrlByHash = (urlHash, done) => {
  shortUrl.findOne(({hash: urlHash}), (err, urlObj) => {
    if (err) return console.error(err);
    done(null, urlObj);
  })
}

app.get('/api/shorturl/:hash', (req, res) => {
  console.log(req.params.hash);
  findUrlByHash(req.params.hash, (err, urlObj) => {
    if (err) throw new Error(err);

    const url = addhttp(urlObj.url);
    res.redirect(url);
  })
})

const userSchema = new Schema({
  username: {type: String, required: true},
  exercises: [{description: String, duration: Number, date: Date}]
});

const User = mongoose.model('User', userSchema);

const createAndSaveUser = (username, done) => {
  const user = new User({username: username});


  user.save((err, user) => {
    if (err) return console.error(err);
    done(null, user);
  })
}
const doesUserExist = (username, done) => {
  User.exists({username: username}, (err, exists) => {
    if (err) return console.error(err);
    done(null, exists);
  })
};

const getAllUsers = (done) => {
  User.find({})
  .select('-exercises')
  .exec((err, arr) => {
    if (err) return console.error(err);
    done(null, arr);
  });
}

const addExerciseToUser = (userId, description, duration, date, done) => {
  User.findOne({_id: userId}, (err, user) => {
    const exercise = {'description': description, 'duration': duration, 'date': date}
    console.log(user);
    user.exercises.push(exercise);
    user.save((err, user) => {
      if (err) return console.error(err);
      done(null, user);
    })
  })
}

app.post('/api/exercise/new-user', (req, res) => {
  const inputUsername = req.body.username;

  doesUserExist(inputUsername, (err, exists) => {
    if (err) return console.error(err);

    if (exists) {
      res.send('Username already taken');
      return;
    }
    
    createAndSaveUser(inputUsername, (err, user) => {
      if (err) return console.error(err);
      res.send({username: user.username, _id: user._id});
    });
  });
  
});

app.get('/api/exercise/users', (req, res) => {
  getAllUsers((err, arr) => {
    res.send(arr);
  })
});

app.post('/api/exercise/add', (req, res) => {
  const userId = req.body.userId;
  const description = req.body.description;
  const duration = req.body.duration;
  let date = new Date(req.body.date);

  if(isNaN(date)) {
    date = new Date();
  }

  addExerciseToUser(userId, description, duration, date, (err, user) => {
    res.send({
      '_id': user._id,
      username: user.username,
      date: date.toString,
      duration: duration,
      description: description
    });
  });

});



app.get('/api/exercise/log', (req, res) => {
  const userId = req.query.userId;
  const fromDate = new Date(req.query.from);
  const toDate = new Date(req.query.to);
  const limit = req.query.limit;

  User.findOne({'_id': userId}, (err, user) => {
    let filteredExercises;

    if(!isNaN(fromDate) && !isNaN(toDate)) {
      filteredExercises = user.exercises.filter(exercise => {
        if(exercise.date >= fromDate || exercise.date <= toDate) {
          return true;
        } else {
          return false;
        }
      })
    } else if(!isNaN(fromDate)) {
      filteredExercises = user.exercises.filter(exercise => {
        if(exercise.date >= fromDate) {
          return true;
        } else {
          return false;
        }
      })
    } else if(!isNaN(toDate)) {
      filteredExercises = user.exercises.filter(exercise => {
        if(exercise.date <= toDate) {
          return true;
        } else {
          return false;
        }
      })
    } else {
      filteredExercises = user.exercises;
    }

    if(!isNaN(limit)) {
      filteredExercises = filteredExercises.slice(0, limit);
    }

    user.exercises = filteredExercises;
    const count = user.exercises.length;
    // const output = {_id: user._id, username: user.username, exercises: user.exercises, }
    const output = {...user._doc, count: count};
    console.log(output);

    res.send(output);
  })

});



// listen for requests :)
const listener = app.listen(process.env.PORT || 5000, function () {
  console.log('Your app is listening on port ' + listener.address().port);
});