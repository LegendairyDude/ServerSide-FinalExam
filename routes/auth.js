// routes/auth.js
const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const passport = require('passport');

// GET /auth/sign-up - Render sign-up form.
router.get('/sign-up', (req, res) => {
  res.render('sign-up', { errors: [] });
});

// POST /auth/sign-up - Process sign-up form.
router.post(
  '/sign-up',
  [
    body('first_name').trim().notEmpty().withMessage('First name is required'),
    body('last_name').trim().notEmpty().withMessage('Last name is required'),
    body('email').isEmail().withMessage('A valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('confirmPassword').custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Passwords do not match');
      }
      return true;
    }),
    body('non_member_display_name').trim().notEmpty().withMessage('Non-member display name is required')
  ],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).render('sign-up', { errors: errors.array() });
    }
    try {
      const pool = req.app.locals.pool;
      const hashedPassword = await bcrypt.hash(req.body.password, 10);
      await pool.query(
        `INSERT INTO users (first_name, last_name, email, password, special_member_name, non_member_display_name)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          req.body.first_name,
          req.body.last_name,
          req.body.email,
          hashedPassword,
          req.body.special_member_name || null,
          req.body.non_member_display_name,
        ]
      );
      res.redirect('/auth/sign-in');
    } catch (err) {
      next(err);
    }
  }
);

// GET /auth/sign-in - Render sign-in form.
router.get('/sign-in', (req, res) => {
  res.render('sign-in', { error: null });
});

// POST /auth/sign-in - Process sign-in form using Passport.
router.post(
  '/sign-in',
  passport.authenticate('local', {
    successRedirect: '/',
    failureRedirect: '/auth/sign-in',
    failureFlash: false,
  })
);

// GET /auth/log-out - Log out the user.
router.get('/log-out', (req, res, next) => {
  req.logout(err => {
    if (err) return next(err);
    res.redirect('/');
  });
});

// GET /auth/admin-join - Render admin join page.
router.get('/admin-join', (req, res) => {
  if (!req.user) {
    return res.redirect('/auth/sign-in');
  }
  res.render('admin-join', { message: null });
});

// POST /auth/admin-join - Process admin secret submission.
router.post('/admin-join', async (req, res, next) => {
  if (!req.user) {
    return res.status(403).send("You must be logged in to join admin.");
  }
  const adminSecret = process.env.ADMIN_SECRET;
  const userInput = req.body.adminSecret; // preserve spaces and formatting.
  if (userInput === adminSecret) {
    try {
      await req.app.locals.pool.query(
        "UPDATE users SET admin = true WHERE id = $1",
        [req.user.id]
      );
      res.redirect('/');
    } catch (err) {
      next(err);
    }
  } else {
    const message = "Admin code is incorrect. Please try again.";
    res.render('admin-join', { message });
  }
});

module.exports = router;
