const jwt = require("jsonwebtoken");
require("dotenv");

module.exports = {
  validateRegistration: (req, res, next) => {
    if (!req.body.username || req.body.username.length < 6) {
      return res.status(400).send({
        msg: "Email do not follow the rules",
      });
    }
    if (
      !req.body.password ||
      req.body.password.length < 8 ||
      req.body.password.length > 64
    ) {
      return res.status(400).send({
        msg: "Incorrect password. Password must contain 8 symbols or more.",
      });
    }
    next();
  },
  isLoggedIn: (req, res, next) => {
    try {
      const token = req.headers.authorization.split(" ")[1];
      const decodedToken = jwt.verify(token, process.env.SECRET_KEY);
      console.log(decodedToken);
      req.userData = decodedToken;
      next();
    } catch (err) {
      return res.status(401).send({ msg: "Your session is invalid" });
    }
  },
};
