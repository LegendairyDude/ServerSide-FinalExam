// routes/secret.js
const express = require('express');
const router = express.Router();

// GET /secret - Render the secret page (for both joining club and gaining admin privileges)
router.get('/', (req, res) => {
  if (!req.user) {
    return res.redirect('/auth/sign-in');
  }
  res.render('secret', { message: null });
});

// POST /secret - Process the secret passcode submission
router.post('/', async (req, res, next) => {
  if (!req.user) {
    return res.status(403).send("You must be logged in to use the secret page.");
  }
  
  // Get the secret entered by the user (preserve spaces, do not trim if spaces are significant)
  const userInput = req.body.secret;
  
  // Retrieve the admin secret from the environment.
  const adminSecret = process.env.ADMIN_SECRET;
  
  // Parse the MEMBER_SECRETS environment variable into an array.
  let memberSecrets = [];
  try {
    memberSecrets = JSON.parse(process.env.MEMBER_SECRETS);
    if (!Array.isArray(memberSecrets)) {
      memberSecrets = [memberSecrets];
    }
  } catch (err) {
    // Fallback if parsing fails; assume the member secret is stored as a plain string.
    memberSecrets = [process.env.MEMBER_SECRETS];
  }
  
  // Flag to track whether any update was applied.
  let updated = false;
  const pool = req.app.locals.pool;
  
  try {
    if (userInput === adminSecret) {
      // If the user enters the admin secret, update their admin flag (and membership status if desired)
      await pool.query(
        "UPDATE users SET admin = true, membership_status = true WHERE id = $1",
        [req.user.id]
      );
      updated = true;
    } else if (memberSecrets.includes(userInput)) {
      // If the user enters one of the valid member secrets, update their membership status
      await pool.query(
        "UPDATE users SET membership_status = true WHERE id = $1",
        [req.user.id]
      );
      updated = true;
    }
    
    if (updated) {
      // Optionally, you may add a flash message or redirect with a success message.
      res.redirect('/');
    } else {
      // If the input doesn’t match any valid secret, return an error message.
      res.render('secret', { message: 'Incorrect secret. Please try again.' });
    }
  } catch (err) {
    next(err);
  }
});

module.exports = router;
