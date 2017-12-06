
var express = require('express');
var app = express();
var MongoClient = require('mongodb').MongoClient, assert = require('assert');
var url = process.env.MONGOLAB_URI;

const GoogleImages = require('google-images');
const client = new GoogleImages(process.env.CSE_ID, process.env.API_Key);

app.use(express.static('public'));

// -----------------------------------------------------------------

var logSearch = function(db, search, callback) {
  var collection = db.collection('imageSearchHistory');
  var timestamp = Date.now();
  collection.insert({
    searchTerm: search,
    timestamp: timestamp
  }, function(err, result) {
    callback(result);
  });
}

var getRecentHistory = function(db, callback) {
  var collection = db.collection('imageSearchHistory');
  
  collection.find()
    .sort( { timestamp: -1 } )
    .limit( 15 )
    .toArray(function(err, docs) {
      console.log("History: ", docs);
      callback(docs);    
  });
}

// -----------------------------------------------------------------

app.get("/", function (request, response) {
  response.sendFile(__dirname + '/views/index.html');
});

app.get("/search/:term", function (req, res, next) {
  var resObj = [];
  var searchTerm = req.params.term;
  var page = 1;
  if (req.query.offset) {
    page = req.query.offset;
  }
  client.search(searchTerm, { page: page })
  .then(function(images) {
    //console.log(images);
    for (let image of images) {
      var info = {
        image_url: image.url,
        thumbnail: image.thumbnail.url,
        description: image.description,
        source_url: image.parentPage
      }
      resObj.push(info);
    }
    res.json(resObj);
    return searchTerm;
  })
  .then(function(searchTerm) {
    MongoClient.connect(url, function(err, db) {
      logSearch(db, searchTerm, function(result) {
        console.log(result);
        db.close();
      });
    });
  })
  .catch(next)
})

app.use(function(err, req, res, next) {
  console.log(err);
});

app.get('/history', function (req, res) {
  MongoClient.connect(url, function(err, db) {
    getRecentHistory(db, function(result) {
      for (let search of result) {
        var d = new Date(search.timestamp);
        search.timestamp = d.toJSON();
      }
      res.json(result);
      db.close();
    });
  });
});


var listener = app.listen(process.env.PORT, function () {
  console.log('Your app is listening on port ' + listener.address().port);
});
