const express = require("express");
const router = express.Router();
const mysql = require("mysql");
// const con = require("./database");
const middleware = require("./users");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();

//--------------MySQL connection--------------------//

const databaseConfig = {
  host: process.env.MYSQL_DB_HOST,
  user: process.env.MYSQL_DB_USER,
  password: process.env.MYSQL_DB_PASS,
  database: process.env.MYSQL_DB_NAME,
  port: process.env.MYSQL_DB_PORT,
};

const database = (callback) => {
  const dbConnection = mysql.createConnection(databaseConfig);
  dbConnection.connect(function (err) {
    if (err) {
      console.log(err);
    } else {
      callback(dbConnection);
      console.log("Success");
    }
  });
};

//--------------AUTHORIZATION----------------------//

router.post("/register", middleware.validateRegistration, (req, res) => {
  database((db) => {
    const username = req.body.username;
    db.query(
      `SELECT * FROM users WHERE username = ${mysql.escape(username)}`,
      (err, result) => {
        if (err) {
          console.log(err);
          return res
            .status(400)
            .json({ msg: "Internal server error checking username validity" });
        } else if (result.length !== 0) {
          return res.status(400).json({ msg: "This username already exists" });
        } else {
          bcrypt.hash(req.body.password, 10, (err, hash) => {
            if (err) {
              console.log(err);
              return res.status(400).json({
                msg: "Internal server error hashing user details",
              });
            } else {
              database((db) => {
                db.query(
                  `INSERT INTO users (username, password) VALUES (${mysql.escape(
                    username
                  )}, ${mysql.escape(hash)})`,
                  (err, result) => {
                    if (err) {
                      console.log(err);
                      return res.status(400).json({
                        msg: "Internal server error saving user details",
                      });
                    } else {
                      return res.status(201).json({
                        msg: "User has been successfully registered",
                      });
                    }
                  }
                );
              });
            }
          });
        }
      }
    );
  });
});

router.get("/users", (req, res) => {
  database((db) =>
    db.query(`SELECT * FROM users`, (err, result) => {
      if (err) console.log(err);
      res.json(result);
    })
  );
});

router.post("/login", (req, res) => {
  database((db) => {
    const username = req.body.username.toLowerCase();
    db.query(
      `SELECT * FROM users WHERE username = '${username}'`,
      (err, result) => {
        if (err) {
          res.status(400).json(err);
        } else {
          bcrypt.compare(
            req.body.password,
            result[0].password,
            (bErr, bResult) => {
              if (bErr) {
                return res
                  .status(400)
                  .json({ msg: "Username or password is incorrect." });
              }
              if (bResult) {
                const token = jwt.sign(
                  {
                    userID: result[0].id,
                    username: result[0].username,
                  },
                  process.env.SECRET_KEY,
                  {
                    expiresIn: "7d",
                  }
                );
                database((db) => {
                  db.query(
                    `UPDATE users SET last_login_date = now() WHERE id = '${result[0].id}'`
                  );
                });
                res.status(200).json({ msg: "Logged in", token });
              }
            }
          );
        }
      }
    );
  });
});

// //----------------USER ACTIONS----------------//

router.post("/add-wine", middleware.isLoggedIn, (req, res) => {
  console.log(req.userData);
  if (
    req.body.name &&
    req.body.region &&
    (req.body.year.length = 4) &&
    req.body.quantity > 0
  ) {
    database((db) => {
      db.query(
        `INSERT INTO wine_types (name, region, type, year, quantity, user_id) VALUES ('${req.body.name}', '${req.body.region}', '${req.body.type}', '${req.body.year}', '${req.body.quantity}', '${req.userData.userID}')`,
        (err, result) => {
          if (err) {
            return res.status(400).json(err);
          } else {
            res.status(201).json({ msg: "Successfully added a wine" });
            console.log(result);
          }
        }
      );
    });
  } else {
    return res.status(400).json({ msg: "Bad request. Check information" });
  }
});

router.get("/wine-list", (req, res) => {
  database((db) => {
    db.query(`SELECT * FROM wine_types`, (err, result) => {
      if (err) {
        res.send(400).json(err);
      } else {
        res.json(result);
      }
    });
  });
});

router.post("/quantity", (req, res) => {
  database((db) => {
    db.query(
      `SELECT * FROM wine_types WHERE id='${req.body.id}'`,
      (err, result) => {
        if (err) {
          res.sendStatus(400).json(err);
        } else {
          database((db) => {
            db.query(
              `UPDATE wine_types SET quantity=IFNULL(quantity, 0)+'${req.body.quantity}' WHERE id = '${req.body.id}'`,
              (err, result) => {
                if (err) res.sendStatus(400).json(err);
                else {
                  res.status(201).json({ msg: "Added item successfully." });
                  console.log(result);
                }
              }
            );
          });
        }
      }
    );
  });
});

router.post("/decrease", (req, res) => {
  if (req.body.quantity > 0) {
    database((db) => {
      db.query(
        `UPDATE wine_types SET quantity=quantity-1 WHERE id = '${req.body.id}'`,
        (err, result) => {
          if (err) res.status(400).json(err);
          res.status(201).json({ msg: "Removed item successfully" });
          console.log(result);
        }
      );
    });
  } else {
    res.status(400).json({ msg: "There are no items in stock" });
  }
});

router.post("/delete", (req, res) => {
  database((db) => {
    db.query(
      `DELETE from wine_types WHERE id = '${req.body.id}'`,
      (err, result) => {
        if (err) res.status(400).json(err);
        res
          .status(201)
          .json({ msg: "Deleted item from database successfully" });
      }
    );
  });
});

module.exports = router;
