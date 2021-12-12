const mongoose = require("mongoose");
const { GridFsStorage } = require("multer-gridfs-storage");
const router = require("express").Router();
const multer = require("multer");
const crypto = require("crypto");
const path = require("path");
require("dotenv").config();

const mongoURI = process.env.MONGO_URI;
const conn = mongoose.createConnection(mongoURI);

let gfs;
conn.once("open", () => {
  gfs = new mongoose.mongo.GridFSBucket(conn.db, {
    bucketName: "media",
  });
});

const storage = new GridFsStorage({
  url: mongoURI,
  options: { useUnifiedTopology: true },
  file: (req, file) => {
    // this function runs every time a new file is created
    return new Promise((resolve, reject) => {
      // use the crypto package to generate some random hex bytes
      crypto.randomBytes(16, (err, buf) => {
        if (err) {
          return reject(err);
        }
        // turn the random bytes into a string and add the file extentsion at the end of it (.mp4)
        // this way our file names will not collide if someone uploads the same file twice
        const filename = buf.toString("hex") + path.extname(file.originalname);
        const fileInfo = {
          filename: filename,
          bucketName: "media",
        };
        // resolve these properties so they will be added to the new file document
        resolve(fileInfo);
      });
    });
  },
});

// set up our multer to use the gridfs storage defined above

const store = multer({
  storage,
  fileFilter: function (req, file, cb) {
    checkFileType(file, cb);
  },
});

function checkFileType(file, cb) {
  const filetypes = /mp4|mov|mkv/;
  //check the file extension
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  // more importantly, check the mimetype
  const mimetype = filetypes.test(file.mimetype);
  // if both are good then continue
  if (mimetype && extname) return cb(null, true);
  // otherwise, return error message
  cb("filetype");
}

const uploadMiddleware = (req, res, next) => {
  const upload = store.single("file");
  upload(req, res, function (err) {
    if (err) {
      console.log(err);
      // check if our filetype error occurred
      if (err === "filetype") return res.status(400).send("Video files only");
      // An unknown error occurred when uploading.

      return res.sendStatus(500);
    }
    // all good, proceed
    next();
  });
};

router.get("/", async (req, res) => {
  try {
    const files = await gfs.find().toArray();
    res.json(files);
  } catch (err) {
    console.log(err);
    res.status(400).send(err);
  }
});

router.post("/upload", uploadMiddleware, async (req, res) => {
  let { file } = req;
  //replace id with _id in the response
  file = JSON.parse(JSON.stringify(file).split('"id":').join('"_id":'));
  console.log("Uploaded file: ", file);
  return res.json(file);
});

//Route for deleting a video

router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  console.log("deleting file: ", id);
  if (!id || id === "undefined") return res.status(400).send("no video id");
  const _id = new mongoose.Types.ObjectId(id);
  gfs.delete(_id, (err) => {
    if (err) return res.status(500).send("video deletion error");
  });
  return res.sendStatus(200);
});

//Route for getting a video

router.get("/:id", ({ params: { id } }, res) => {
  console.log("hello from get video");
  // if no id return error
  if (!id || id === "undefined") return res.status(400).send("No video id");
  // if there is an id string, cast it to mongoose's objectId type
  const _id = new mongoose.Types.ObjectId(id);
  // search for the file by id
  gfs.find({ _id }).toArray((err, files) => {
    if (!files || files.length === 0)
      return res.status(400).send("no files exist");

    // if a file exists, stream the file to the client
    gfs.openDownloadStream(_id).pipe(res);
  });
});

module.exports = router;
