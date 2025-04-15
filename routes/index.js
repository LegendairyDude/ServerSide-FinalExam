// routes/index.js
const express = require('express');
const router = express.Router();

// GET / - Landing page and message feed.
router.get('/', async (req, res, next) => {
  const pool = req.app.locals.pool;

  // Define the SQL query to fetch messages along with author display names.
  const query = `
    SELECT 
      m.id, 
      m.title, 
      m.content, 
      m.created_at,
      u.special_member_name, 
      u.non_member_display_name
    FROM messages m
    JOIN users u ON m.user_id = u.id
    ORDER BY m.created_at DESC
  `;

  try {
    // Execute the query and retrieve the messages.
    const { rows: messages } = await pool.query(query);

    // Render the 'index' view, passing the logged-in user and the messages list.
    res.render('index', { 
      user: req.user, 
      messages: messages || [] 
    });
  } catch (error) {
    // Log the error and pass it to Express error handling middleware.
    console.error('Error fetching messages:', error);
    next(error);
  }
});

module.exports = router;
