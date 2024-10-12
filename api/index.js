const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const User = require("./models/User");
const Post = require("./models/Post");
const bcrypt = require('bcrypt');
const app = express();
const jwt = require('jsonwebtoken');
const CookieParser = require("cookie-parser");
const multer = require('multer');
const uploadMiddleware = multer({ dest: 'uploads/' });
const fs = require('fs');

const salt = bcrypt.genSaltSync(10);
const secret = "asdfavsafgsdafdsacvsavfdhfdsdfds";

// Use cors middleware
app.use(cors({credentials:true, origin:"http://localhost:3000"}));

// Middleware to parse JSON bodies
app.use(express.json());

app.use(CookieParser());
app.use('/uploads', express.static(__dirname + '/uploads'));

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/blog-app')
  .then(() => console.log("Connected to MongoDB"))
  .catch(err => console.error("Could not connect to MongoDB:", err));

app.post('/register', async (req, res) => {
  const { username, password } = req.body;

  try {
    const userDoc = await User.create({ username, password:bcrypt.hashSync(password,salt),
    });
    // console.log(userDoc);
    // Respond with success message
    res.status(200).json({ message: 'Registration successful' }); // Alert for success
  } catch (error) {
    console.error(error);
    // Respond with error message
    res.status(400).json({ message: 'Error registering user: ' + error.message }); // Alert for error
  }
});

app.post('/login', async(req, res) => {
  const { username, password } = req.body;
  const userDoc = await User.findOne({ username });
  
  if (!userDoc) {
    // If user is not found
    return res.status(400).json({ message: 'wrong credentials' });
  }

  const passOk = bcrypt.compareSync(password, userDoc.password);
  if (passOk) {
    //logged in
    jwt.sign({ username, id: userDoc._id }, secret, {}, (err, token) => {
      if (err) throw err;
      res.cookie('token', token).json({
        id: userDoc._id,
        username,
      });
    });
  } else {
    res.status(400).json({ message: 'wrong credentials' });
  }
});

app.get('/profile', (req, res) => {
  const { token } = req.cookies;

  // Check if token is missing
  if (!token) {
    return res.status(401).json({ message: "No token provided" });
  }

  // Verify the token
  jwt.verify(token, secret, {}, (err, info) => {
    if (err) {
      console.error('JWT verification error:', err);
      return res.status(401).json({ message: "Invalid or expired token" });
    }

    // Send back the decoded info
    res.json(info);
  });
});


app.post('/logout',(req,res) => {
  res.cookie('token', '').json('ok');
})

app.post('/post', uploadMiddleware.single('file'), async (req,res) => {
  const {originalname,path} = req.file;
  const parts = originalname.split('.');
  const ext = parts[parts.length - 1];
  const newPath = path+'.'+ext;
  fs.renameSync(path, newPath);

  const { token } = req.cookies;
  jwt.verify(token, secret, {}, async (err, info) => {
    if (err) throw err
    const{title,summary,content} = req.body;
    const postDoc = await Post.create({
      title,
      summary,
      content,
      cover:newPath,
      author: info.id,
    });
    res.json({postDoc});
  });
});

app.put('/post/:id', uploadMiddleware.single('file'), async (req, res) => {
  let newPath = null;

  if (req.file) {
    const { originalname, path } = req.file;
    const parts = originalname.split('.');
    const ext = parts[parts.length - 1];
    newPath = path + '.' + ext;
    fs.renameSync(path, newPath);
  }

  const { token } = req.cookies;
  jwt.verify(token, secret, {}, async (err, info) => {
    if (err) return res.status(401).json('Token verification failed');

    const { id } = req.params; // Get post ID from URL
    const { title, summary, content } = req.body;
    const postDoc = await Post.findById(id);

    if (!postDoc) {
      return res.status(404).json('Post not found');
    }

    const isAuthor = postDoc.author.equals(info.id); // Use equals() to compare ObjectId
    if (!isAuthor) {
      return res.status(403).json('You are not the author of this post');
    }

    // Update the post document
    postDoc.title = title;
    postDoc.summary = summary;
    postDoc.content = content;
    if (newPath) {
      postDoc.cover = newPath; // Update cover only if a new file is uploaded
    }

    await postDoc.save(); // Save the updated post

    res.json(postDoc);
  });
});


app.get('/post', async (req,res) =>{
  res.json(await Post.find().populate('author',['username']).sort({created: -1}).limit(20));
})


app.get('/post/:id', async (req, res) => {
  const {id} = req.params;
  const postDoc = await Post.findById(id).populate('author', ['username']);
  console.log(postDoc); // Log this to check if `content` is present
  res.json(postDoc);
});


app.listen(4000, () => {
  console.log("Server is running on http://localhost:4000");
});
