const express = require("express");
const controller = require("../controllers/auth");
const verifyToken = require("../middleware/verifytoken");

const router = express.Router();

router.route("/register")
.post(controller.register);


router.route("/login")
.post(controller.login);
 module.exports = router;