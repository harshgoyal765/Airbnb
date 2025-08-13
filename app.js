// Load environment variables first
const dotenv = require('dotenv');
dotenv.config();

// Core Modules
const path = require('path');

// External Modules
const express = require('express');
const session = require('express-session');
const MongoDBStore = require('connect-mongodb-session')(session);
const multer = require('multer');
const mongoose = require('mongoose');

// Local Modules
const storeRouter = require("./routes/storeRouter");
const hostRouter = require("./routes/hostRouter");
const authRouter = require("./routes/authRouter");
const rootDir = require("./utils/pathUtil");
const errorsController = require("./controllers/errors");

const app = express();

// EJS Setup
app.set('view engine', 'ejs');
app.set('views', 'views');

// Check environment variables
if (!process.env.DB_PATH || !process.env.SESSION_SECRET) {
  console.error("Error: DB_PATH or SESSION_SECRET not defined in .env");
  process.exit(1);
}

// MongoDB Store
const store = new MongoDBStore({
  uri: process.env.DB_PATH,
  collection: 'sessions'
});

// Multer Setup
const randomString = (length) => {
  const characters = 'abcdefghijklmnopqrstuvwxyz';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, randomString(10) + '-' + file.originalname)
});

const fileFilter = (req, file, cb) => {
  if (['image/png','image/jpg','image/jpeg'].includes(file.mimetype)) cb(null, true);
  else cb(null, false);
}

const multerOptions = { storage, fileFilter };

// Session Middleware
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
  store
}));
app.use((req, res, next) => {
  res.locals.isLoggedIn = req.session.isLoggedIn || false;
  res.locals.user = req.session.user || null;
  next();
});

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(multer(multerOptions).single('photo'));
app.use(express.static(path.join(rootDir, 'public')));
app.use("/uploads", express.static(path.join(rootDir, 'uploads')));
app.use("/host/uploads", express.static(path.join(rootDir, 'uploads')));
app.use("/homes/uploads", express.static(path.join(rootDir, 'uploads')));




// Routes
app.use(authRouter);
app.use(storeRouter);
app.use("/host", (req, res, next) => {
  if (req.isLoggedIn) next();
  else res.redirect("/login");
});
app.use("/host", hostRouter);

// 404
app.use(errorsController.pageNotFound);

// Start Server
const PORT = process.env.PORT || 3000;

mongoose.connect(process.env.DB_PATH)
  .then(() => {
    console.log('Connected to MongoDB');
    app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
  })
  .catch(err => console.log('Error while connecting to MongoDB: ', err));
