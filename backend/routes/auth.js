const express = require("express");
const controller = require("../controllers/auth");
const verifyToken = require("../middleware/verifytoken");
const upload = require("../middleware/upload");

const router = express.Router();

// Register with multiple file uploads (document and image are optional)
router.route("/register")
.post(
  upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'document', maxCount: 1 }
  ]),
  controller.register
);

router.route("/login")
.post(controller.login);

module.exports = router;