// routes/messages.js
const express = require('express');
const router = express.Router();

// GET /messages/new - Render new message form along with the message feed.
router.get('/new', async (req, res, next) => {
  if (!req.user) {
    return res.redirect('/auth/sign-in');
  }
  
  try {
    const pool = req.app.locals.pool;
    
    // Query messages with author details.
    const query = `
      SELECT m.id, m.title, m.content, m.created_at, 
             u.special_member_name, u.non_member_display_name
      FROM messages m
      JOIN users u ON m.user_id = u.id
      ORDER BY m.created_at DESC
    `;
    const { rows: messages } = await pool.query(query);
    
    // Render the view with the current user and messages.
    res.render('new-message', { user: req.user, messages });
  } catch (err) {
    next(err);
  }
});

// POST /messages/new - Process new message submission.
router.post('/new', async (req, res, next) => {
  if (!req.user) {
    return res.status(403).send("You must be logged in to post messages.");
  }
  
  try {
    const pool = req.app.locals.pool;
    
    await pool.query(
      "INSERT INTO messages (user_id, title, content) VALUES ($1, $2, $3)",
      [req.user.id, req.body.title, req.body.content]
    );
    
    res.redirect('/messages/new');
  } catch (err) {
    next(err);
  }
});

// POST /messages/:id/delete - Delete message (admin only).
router.post('/:id/delete', async (req, res, next) => {
  if (!req.user || !req.user.admin) {
    return res.status(403).send("Access denied. Admin privileges required.");
  }
  
  try {
    const pool = req.app.locals.pool;
    
    // Delete the message with the given id.
    await pool.query("DELETE FROM messages WHERE id = $1", [req.params.id]);
    
    res.redirect('/messages/new');
  } catch (err) {
    next(err);
  }
});

module.exports = router;
