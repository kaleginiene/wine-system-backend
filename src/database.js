const mysql = require("mysql");
require("dotenv").config();

const con = mysql.createConnection({
  host: process.env.MYSQL_DB_HOST,
  user: process.env.MYSQL_DB_USER,
  password: process.env.MYSQL_DB_PASS,
  database: process.env.MYSQL_DB_NAME,
  port: process.env.MYSQL_DB_PORT,
});

con.connect((err) => {
  if (err) {
    console.log(err);
    if (err.code === "ECONNRESET") {
      setTimeout(
        con.connect((err) => {
          if (err) {
            console.log(err);
          }
        }),
        2000
      );
    }
  } else {
    console.log("Successfully connected to database");
  }
});

module.exports = con;
