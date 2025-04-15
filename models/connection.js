const { Pool } = require("pg");
const pool = new Pool({
  host: "localhost",
  user: "legendairy",
  database: "final_exam",
  password: "psqlPassword",
  port: 5432
});
