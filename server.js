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
app.use(express.json());

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
    console.log('Database ready to go!');
    db.each('SELECT * FROM links LIMIT 10', function(err, row) {
      if (row) {
        console.log('record:', row);
      }
    });
  }
});

var crypto = require('crypto');

function newSlug(callback) {
  const SLUG_LENGTH_BYTES = 8;
  
  crypto.randomBytes(SLUG_LENGTH_BYTES, (err, buf) => {
    if (err) {
      callback(err);
    } else {
      const slug = buf.toString('base64')
        .replace(/\+/g, '-') // Convert '+' to '-'
        .replace(/\//g, '_') // Convert '/' to '_'
        .replace(/=+$/, ''); // Remove ending '='

      callback(null, slug);
    }
  });
}

function getBySlug(slug, callback) {
   db.get(
    'SELCT * FROM links WHERE slug = ?', 
    [slug], 
    (err, row) => {
      if (err) { 
        callback(err); 
      } else {
        callback(null, row);
      }
    });
}

function getByURL(url, callback) {
   db.get(
    'SELCT * FROM links WHERE url = ?', 
    [url], 
    (err, row) => {
      if (err) { 
        callback(err); 
      } else {
        callback(null, row);
      }
    });
}

function insertNew(slug, url, callback) {
   db.run(
      'INSERT INTO links VALUES (slug = ?, url = ?)', 
      [slug, url], 
      (err) => {  
        callback(err);
      });
}

// http://expressjs.com/en/starter/basic-routing.html
app.get('/', function(request, response) {
  response.sendFile(__dirname + '/views/index.html');
});

app.get('/l/:slug', function(request, response) {  
  getBySlug(request.params.slug, (err, link) => {
    if (err || !link) {
      // Redirect to error page!      
    } else {
      response.redirect(link.url);
    }
  });
});

// endpoint to get all the dreams in the database
// currently this is the only endpoint, ie. adding dreams won't update the database
// read the sqlite3 module docs and try to add your own! https://www.npmjs.com/package/sqlite3
app.get('/link/:slug', function(request, response) {
  getBySlug(request.params.slug, (err, link) => {
      if (err) {
        response.json({status: 'db_error', error: err});
      } else {
        response.json({status: 'ok', link: row});
      }
  });
});

app.post('/link', function(request, response) {
  // TODO: Authenticate!!
  newSlug((err, slug) => {
    if (!request.body.url) {
      response.json({status: 'no', error: 'No url provided.'});
    } else {
      db.run(
        'INSERT INTO links VALUES (slug = ?, url = ?)', 
        [slug, request.body.url], 
        (err) => {
          if (err) {
            db.get(
              'SELECT * FROM links WHERE url = ?', 
              [request.body.url], 
              (err, row) => {
                if (err) {
                  response.json({status: 'db_error', error: err});
                } else {
                  response.json({status: 'ok', link: row});
                }                
              });
          } else {
            response.json({status: 'ok', href: ''});        
          }
        });    
    }
  });
});

// listen for requests :)
var listener = app.listen(process.env.PORT, function() {
  console.log('Your app is listening on port ' + listener.address().port);
});
