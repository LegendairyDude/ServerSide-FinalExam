// app.js
require('dotenv').config();
const express = require('express');
const path = require('path');
const session = require('express-session');
const { Pool } = require('pg');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcryptjs');

const app = express();

// Serve static files from the public folder
app.use(express.static(path.join(__dirname, 'public')));

// Set views and view engine.
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Middleware to parse form data.
app.use(express.urlencoded({ extended: false }));

// Setup session.
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
}));

// Initialize Passport.
app.use(passport.initialize());
app.use(passport.session());

// Create PostgreSQL pool using .env variables.
const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// Make the pool accessible in route handlers.
app.locals.pool = pool;

/* -------- Passport Configuration -------- */
passport.use(new LocalStrategy({ usernameField: 'email' }, async (email, password, done) => {
  try {
    const { rows } = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    const user = rows[0];
    if (!user) {
      return done(null, false, { message: "Incorrect email" });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return done(null, false, { message: "Incorrect password" });
    }
    return done(null, user);
  } catch (err) {
    return done(err);
  }
}));

passport.serializeUser((user, done) => {
  done(null, user.id);
});
passport.deserializeUser(async (id, done) => {
  try {
    const { rows } = await pool.query("SELECT * FROM users WHERE id = $1", [id]);
    const user = rows[0];
    done(null, user);
  } catch (err) {
    done(err);
  }
});

/* -------- Mount Modular Routes -------- */
const indexRouter = require('./routes/index');
const authRouter = require('./routes/auth');
const messagesRouter = require('./routes/messages');
const secretRouter = require('./routes/secret'); // This handles both join club and admin join

app.use('/', indexRouter);            // Home and message feed.
app.use('/auth', authRouter);          // Sign-up, sign-in, log-out, etc.
app.use('/messages', messagesRouter);  // Message creation.
app.use('/secret', secretRouter);      // Single secret page for membership/admin upgrade.

// Start the server.
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`App listening on port ${PORT}! http://localhost:${PORT}`));
