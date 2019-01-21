// server.js
// where your node app starts

// init project
var express = require('express');
var bodyParser = require('body-parser');
var app = express();
app.use(bodyParser.urlencoded({ extended: true }));

// we've started you off with Express, 
// but feel free to use whatever libs or frameworks you'd like through `package.json`.

// http://expressjs.com/en/starter/static-files.html
app.use(express.static('public'));

// init sqlite db
var fs = require('fs');
var dbFile = './.data/sqlite.db';
var exists = fs.existsSync(dbFile);
var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database(dbFile);

// if ./.data/sqlite.db does not exist, create it, otherwise print records to console
db.serialize(function(){
  if (!exists) {
    db.run(
      'CREATE TABLE links ('+
      '    slug TEXT PRIMARY KEY,'+
      '    url TEXT UNIQUE,' +
      '    created DATETIME DEFAULT CURRENT_TIMESTAMP'+
      ')'
    );
  }
  else {
    console.log('Database "Dreams" ready to go!');
    db.each('SELECT * FROM links LIMIT 10', function(err, row) {
      if (row) {
        console.log('record:', row);
      }
    });
  }
});

var crypto = require('crypto');
function newSlug(callback) {
  crypto.randomBytes(8, (err, buf) => {
    if (err) {
      callback(err);
      return;
    }
    
    callback(null, 
    console.log(`${buf.length} bytes of random data: ${buf.toString('hex')}`);
  });
}

// http://expressjs.com/en/starter/basic-routing.html
app.get('/', function(request, response) {
  response.sendFile(__dirname + '/views/index.html');
});

app.get('/l/:slug', function(request, response) {
  db.get(
    'SELCT * FROM links WHERE slug = ?', 
    [request.params.slug], 
    (err, row) => {
      if (row) {
        response.redirect(row.url);
      }
    });
});

// endpoint to get all the dreams in the database
// currently this is the only endpoint, ie. adding dreams won't update the database
// read the sqlite3 module docs and try to add your own! https://www.npmjs.com/package/sqlite3
app.get('/link/:slug', function(request, response) {
  db.get(
    'SELCT * FROM links WHERE slug = ?', 
    [request.params.slug], 
    (err, row) => {
      if (err) {
        response.json({status: 'db_error', error: err});
      } else {
        response.json({status: 'ok', link: row});
      }
    }
  );
});

app.post('/link', function(request, response) {
  // Hash URL and try to insert successively longer prefixes? Make a random slug?
  
  db.run(
    'INSERT INTO links VALUES (slug = ?, url = ?)', 
    [slug, url], 
    (err) => {
      
    });
  response.json({status: 'ok'});
});

// listen for requests :)
var listener = app.listen(process.env.PORT, function() {
  console.log('Your app is listening on port ' + listener.address().port);
});
