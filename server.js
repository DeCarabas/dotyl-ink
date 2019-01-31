const assert = require("assert");
const crypto = require("crypto");
const fs = require("fs");
const sqlite3 = require("sqlite3").verbose();

const express = require("express");
const bodyParser = require("body-parser");
const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(express.json());

function initializeDatabase() {
  const dbFile = "./.data/sqlite.db";
  const exists = fs.existsSync(dbFile);
  const db = new sqlite3.Database(dbFile);

  // if ./.data/sqlite.db does not exist, create it, otherwise print records to console
  db.serialize(function() {
    if (!exists) {
      db.run(
        "CREATE TABLE links (" +
          "    slug TEXT PRIMARY KEY," +
          "    url TEXT UNIQUE," +
          "    created DATETIME DEFAULT CURRENT_TIMESTAMP" +
          ")"
      );
    } else {
      console.log("Database ready to go!");
      db.each("SELECT * FROM links LIMIT 10", function(err, row) {
        if (row) {
          console.log("record:", row);
        }
      });
    }
  });

  return db;
}

const db = initializeDatabase();

function getBySlug(slug, callback) {
  db.get("SELECT * FROM links WHERE slug = ?", [slug], (err, row) => {
    if (err) {
      console.log("getBySlug error:", err);
      callback(err);
    } else {
      callback(null, row);
    }
  });
}

function getByURL(url, callback) {
  db.get("SELECT * FROM links WHERE url = ?", [url], (err, row) => {
    if (err) {
      console.log("getByURL error:", err);
      callback(err);
    } else {
      callback(null, row);
    }
  });
}

function getLatest(callback) {
  db.all(
    "SELECT * FROM links ORDER BY created DESC LIMIT 100",
    [],
    (err, rows) => {
      if (err) {
        console.log("getLatest error:", err);
        callback(err);
      } else {
        callback(null, rows);
      }
    }
  );
}

function insertNew(slug, url, callback) {
  db.run("INSERT INTO links(slug, url) VALUES (?, ?)", [slug, url], err => {
    if (err) {
      console.log("insertNew error:", err);
    }
    callback(err);
  });
}

function newSlug(callback) {
  const SLUG_LENGTH_BYTES = 6;

  crypto.randomBytes(SLUG_LENGTH_BYTES, (err, buf) => {
    if (err) {
      callback(err);
    } else {
      const slug = base32encode(buf).replace(/=+$/, ""); // Remove pading.
      callback(null, slug);
    }
  });
}

function formatShortLink(slug) {
  return "/l/" + slug;
}

// http://expressjs.com/en/starter/basic-routing.html
app.get("/", function(request, response) {
  response.sendFile(__dirname + "/views/index.html");
});

app.get("/l/:slug", function(request, response) {
  console.log("Fetching by slug:", request.params.slug);
  getBySlug(request.params.slug, (err, link) => {
    if (err || !link) {
      response.status(404).sendFile(__dirname + "/views/not_found.html");
    } else {
      response.redirect(link.url);
    }
  });
});

app.get("/link/:slug", function(request, response) {
  getBySlug(request.params.slug, (err, link) => {
    if (err) {
      response.status(500).json({ status: "db_error", errors: [err] });
    } else {
      const short = formatShortLink(link.slug);
      response.json({
        status: "ok",
        link: { slug: link.slug, url: link.url, short }
      });
    }
  });
});

app.get("/link", function(request, response) {
  getLatest((err, rows) => {
    if (err) {
      response.status(500).json({ status: "db_error", errors: [err] });
    } else {
      const links = rows.map(r => {
        return { slug: r.slug, url: r.url, short: formatShortLink(r.slug) };
      });
      response.json({ status: "ok", links: links });
    }
  });
});

app.post("/link", function(request, response) {
  console.log("Received a post request");
  if (request.body.password != process.env.PASSWORD) {
    console.log(request.body, process.env.PASSWORD);
    response.status(403).json({ status: "access_denied" });
    return;
  }

  newSlug((err, slug) => {
    const url = request.body.url;
    if (err) {
      response.json({ status: "no", errors: [err] });
    } else if (!url) {
      response.status(400).json({ status: "no", errors: ["No url provided."] });
    } else if (!(url.startsWith("http://") || url.startsWith("https://"))) {
      response.status(400).json({
        status: "no",
        errors: ["URL doesn't appear to be HTTP or HTTPS."]
      });
    } else {
      console.log("Creating link for", slug, url);
      const short = formatShortLink(slug);
      if (short.length >= url.length) {
        console.log("That link is already short enough.");
        response.json({ status: "ok", link: { slug, url, short: url } });
      } else {
        insertNew(slug, url, err_insert => {
          if (err_insert) {
            getByURL(request.body.url, (err_get, existing) => {
              if (err_get || !existing) {
                response
                  .status(500)
                  .json({ status: "db_error", errors: [err_insert, err_get] });
              } else {
                const short = formatShortLink(existing.slug);
                response.json({
                  status: "ok",
                  link: { slug: existing.slug, url, short }
                });
              }
            });
          } else {
            response.json({ status: "ok", link: { slug, url, short } });
          }
        });
      }
    }
  });
});

// listen for requests :)
var listener = app.listen(process.env.PORT, function() {
  console.log("Your app is listening on port " + listener.address().port);
});

function base32encode(buf) {
  const table = "abcdefghijklmonpqrstuvwxyz234567=";
  let result = "";

  let i = 0;
  let src_size = buf.length;
  let n1, n2, n3, n4, n5, n6, n7, n8;
  while (src_size >= 1) {
    // Inputs.
    n1 = n2 = n3 = n4 = n5 = n6 = n7 = n8 = 0;
    const block_size = src_size < 5 ? src_size : 5;
    switch (block_size) {
      case 5:
        n8 = buf[i + 4] & 0x1f;
        n7 = (buf[i + 4] & 0xe0) >> 5;
      case 4:
        n7 |= (buf[i + 3] & 0x03) << 3;
        n6 = (buf[i + 3] & 0x7c) >> 2;
        n5 = (buf[i + 3] & 0x80) >> 7;
      case 3:
        n5 |= (buf[i + 2] & 0x0f) << 1;
        n4 = (buf[i + 2] & 0xf0) >> 4;
      case 2:
        n4 |= (buf[i + 1] & 0x01) << 4;
        n3 = (buf[i + 1] & 0x3e) >> 1;
        n2 = (buf[i + 1] & 0xc0) >> 6;
      case 1:
        n2 |= (buf[i + 0] & 0x07) << 2;
        n1 = (buf[i + 0] & 0xf8) >> 3;
        break;

      default:
        // Not reached
        assert(0);
    }
    i += block_size;
    src_size -= block_size;

    // Validate
    assert(n1 <= 31);
    assert(n2 <= 31);
    assert(n3 <= 31);
    assert(n4 <= 31);
    assert(n5 <= 31);
    assert(n6 <= 31);
    assert(n7 <= 31);
    assert(n8 <= 31);

    // Padding?
    switch (block_size) {
      case 1:
        n3 = n4 = 32;
      case 2:
        n5 = 32;
      case 3:
        n6 = n7 = 32;
      case 4:
        n8 = 32;
      case 5:
        break;

      default:
        assert(0);
    }

    result += table[n1];
    result += table[n2];
    result += table[n3];
    result += table[n4];
    result += table[n5];
    result += table[n6];
    result += table[n7];
    result += table[n8];
  }

  return result;
}
