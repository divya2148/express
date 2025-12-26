const express = require("express");
const jwt = require("jsonwebtoken");
const cors= require("cors");

const db = require("./Db/initialize.js");
const initializeDatabase = require("./Db/model.js");
initializeDatabase();

const app = express();
app.use(express.json());
app.use(cors());

const SECRET_KEY = "mysecretkey";

/* ======================
   JWT VERIFY
====================== */
function verifyToken(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(403).json({ message: "Token missing" });

  const token = auth.split(" ")[1];
  jwt.verify(token, SECRET_KEY, (err, decoded) => {
    if (err) return res.status(401).json({ message: "Invalid token" });
    req.user = decoded;
    next();
  });
}

/* ======================
   REGISTER
====================== */
app.post("/register", async (req, res) => {
  const { username, password, isPrivate } = req.body;

  try {
    await db.query(
      "INSERT INTO users (username, password, is_private) VALUES (?, ?, ?)",
      [username, password, isPrivate]
    );
    res.json({ message: "User registered successfully" });
  } catch (err) {
    res.status(400).json({ message: "Username already exists" });
  }
});

/* ======================
   LOGIN
====================== */
app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  const [rows] = await db.query(
    "SELECT * FROM users WHERE username=? AND password=?",
    [username, password]
  );

  if (rows.length === 0) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const user = rows[0];

  const token = jwt.sign(
    { userId: user.id, username: user.username },
    SECRET_KEY,
    { expiresIn: "1h" }
  );

  res.json({ token });
});

/* ======================
   ADD POST
====================== */
app.post("/posts", verifyToken, async (req, res) => {
  const { caption } = req.body;

  await db.query(
    "INSERT INTO posts (user_id, caption) VALUES (?, ?)",
    [req.user.userId, caption]
  );

  res.json({ message: "Post added successfully" });
});

/* ======================
   VIEW POSTS
====================== */
app.get("/posts/:userId", verifyToken, async (req, res) => {
  const profileUserId = req.params.userId;
  const viewerId = req.user.userId; // ✅ CORRECT

  const [[profileUser]] = await db.query(
    "SELECT * FROM users WHERE id=?",
    [profileUserId]
  );

  if (!profileUser) {
    return res.status(404).json({ message: "User not found" });
  }

  
  // 🔒 PRIVATE ACCOUNT CHECK
  if (profileUser.is_private == 1 && profileUser.id != viewerId) {
    return res.status(403).json({
      message: "Private account. Only owner can see posts"
    });
  }

  const [posts] = await db.query(
    "SELECT * FROM posts WHERE user_id = ?",
    [profileUserId]
  );

  res.json(posts);
});


  


/* ======================
   SERVER
====================== */
app.listen(5000, () => {
  console.log("✅ Server running on http://localhost:5000");
});
