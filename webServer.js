const mongoose = require("mongoose");
mongoose.Promise = require("bluebird");

const express = require("express");
const session = require("express-session");
const bodyParser = require("body-parser");
const multer = require("multer");
const fs = require("fs");
const { makePasswordEntry, doesPasswordMatch } = require("./password");

const User = require("./schema/user.js");
const Photo = require("./schema/photo.js");
const SchemaInfo = require("./schema/schemaInfo.js");

mongoose.set("strictQuery", false);
mongoose.connect("mongodb://127.0.0.1/project6", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const app = express();
const processFormBody = multer({ storage: multer.memoryStorage() }).single(
  "uploadedphoto"
);

app.use(express.static(__dirname));
app.use(
  session({ secret: "secretKey", resave: false, saveUninitialized: false })
);
app.use(bodyParser.json());

// Middleware to check if user is logged in
const allowedPaths = ["/admin/login", "/user"];
app.use((req, res, next) => {
  if (!req.session.user && !allowedPaths.includes(req.path)) {
    return res.status(401).send("Unauthorized");
  } else {
    return next();
  }
});

// Route to handle user registration
app.post("/user", async (req, res) => {
  const {
    login_name,
    password,
    first_name,
    last_name,
    location,
    description,
    occupation,
  } = req.body;

  if (!login_name || !password || !first_name || !last_name) {
    return res.status(400).send("Missing required fields");
  }

  try {
    const existingUser = await User.findOne({ login_name });
    if (existingUser) {
      return res.status(400).send("Login name already exists");
    }

    const passwordEntry = makePasswordEntry(password);

    const newUser = new User({
      login_name,
      password_digest: passwordEntry.hash,
      salt: passwordEntry.salt,
      first_name,
      last_name,
      location,
      description,
      occupation,
    });

    await newUser.save();
    return res.status(200).send({ login_name });
  } catch (err) {
    console.error("Error during user registration:", err);
    return res.status(500).send("Internal server error");
  }
});

// Route to handle user login
app.post("/admin/login", async (req, res) => {
  const { login_name, password } = req.body;

  if (!login_name || !password) {
    return res.status(400).send("Missing login name or password");
  }

  try {
    const user = await User.findOne({ login_name });
    if (
      !user ||
      !doesPasswordMatch(user.password_digest, user.salt, password)
    ) {
      return res.status(400).send("Invalid login credentials");
    }

    req.session.user = user;
    return res.send({ _id: user._id, first_name: user.first_name });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).send("Internal server error");
  }
});

// Route to handle user logout
app.post("/admin/logout", (req, res) => {
  if (!req.session.user) {
    return res.status(400).send("No user currently logged in");
  }

  req.session.destroy((err) => {
    if (err) {
      console.error("Logout error:", err);
      return res.status(500).send("Internal server error");
    }

    // Clear the session cookie on the client side
    res.clearCookie("connect.sid"); // Ensure the session cookie is cleared

    return res.sendStatus(200);
  });
  return undefined;
});

// Middleware to check if user is logged in for specific routes
const requireLogin = (req, res, next) => {
  if (!req.session.user) {
    return res.status(401).send("Unauthorized");
  } else {
    return next();
  }
};

// Route to get SchemaInfo
app.get("/test/:p1", requireLogin, async function (request, response) {
  const param = request.params.p1 || "info";

  if (param === "info") {
    try {
      const info = await SchemaInfo.find({});
      if (info.length === 0) {
        return response.status(500).send("Missing SchemaInfo");
      }
      return response.json(info[0]);
    } catch (err) {
      return response.status(500).json(err);
    }
  } else if (param === "counts") {
    const collections = [
      { name: "user", collection: User },
      { name: "photo", collection: Photo },
      { name: "schemaInfo", collection: SchemaInfo },
    ];

    try {
      await Promise.all(
        collections.map(async (col) => {
          col.count = await col.collection.countDocuments({});
          return col;
        })
      );

      const obj = {};
      for (let i = 0; i < collections.length; i++) {
        obj[collections[i].name] = collections[i].count;
      }
      return response.json(obj);
    } catch (err) {
      return response.status(500).send(JSON.stringify(err));
    }
  } else {
    return response.status(400).send("Bad param " + param);
  }
});

// Route to upload a photo
app.post("/photos/new", requireLogin, (req, res) => {
  if (!req.session.user) {
    console.warn("Unauthorized access attempt to /photos/new");
    return res.status(401).send("Unauthorized");
  }

  processFormBody(req, res, async (uploadErr) => {
    if (uploadErr || !req.file) {
      console.error("File upload error or no file provided:", uploadErr);
      return res.status(400).send("File upload error");
    }

    const timestamp = new Date().valueOf();
    const filename = "U" + timestamp + req.file.originalname;

    fs.writeFile(`./images/${filename}`, req.file.buffer, async (err) => {
      if (err) {
        console.error("Failed to save the file:", err);
        return res.status(500).send("Failed to save the file");
      }

      const newPhoto = new Photo({
        file_name: filename,
        date_time: new Date(),
        user_id: req.session.user._id,
      });

      try {
        await newPhoto.save();
        return res.status(200).send("Photo uploaded successfully");
      } catch (saveErr) {
        console.error("Photo save error:", saveErr);
        return res.status(500).send("Failed to save photo in database");
      }
    });
    return undefined;
  });
  return undefined;
});


// Route to like a photo
app.post("/photos/:id/like", requireLogin, async (req, res) => {
  const photoId = req.params.id;
  const userId = req.session.user._id;

  if (!userId) {
    return res.status(401).send({ message: "User not authenticated" });
  }

  try {
    const photo = await Photo.findById(photoId);

    if (!photo) {
      return res.status(404).send({ message: "Photo not found" });
    }

    const totalUsers = await User.countDocuments({});
    if (!photo.likes.includes(userId) && photo.likes.length < totalUsers) {
      photo.likes.push(userId);
      await photo.save();
      return res.status(200).send({ message: "Photo liked", likes: photo.likes.length });
    } else if (photo.likes.includes(userId)) {
      return res.status(400).send({ message: "User already liked this photo" });
    } else {
      return res.status(400).send({ message: "Likes limit exceeded" });
    }
  } catch (err) {
    console.error("Error liking photo:", err);
    return res.status(500).send({ message: "Internal server error" });
  }
});

// Route to unlike a photo
app.post("/photos/:id/unlike", requireLogin, async (req, res) => {
  const photoId = req.params.id;
  const userId = req.session.user._id;

  if (!userId) {
    return res.status(401).send({ message: "User not authenticated" });
  }

  try {
    const photo = await Photo.findById(photoId);

    if (!photo) {
      return res.status(404).send({ message: "Photo not found" });
    }

    if (photo.likes.includes(userId)) {
      photo.likes.pull(userId);
      await photo.save();
      return res.status(200).send({ message: "Photo unliked", likes: photo.likes.length });
    } else {
      return res.status(400).send({ message: "User has not liked this photo" });
    }
  } catch (err) {
    console.error("Error unliking photo:", err);
    return res.status(500).send({ message: "Internal server error" });
  }
});

// Route to fetch user list
app.get("/user/list", requireLogin, async function (req, res) {
  try {
    const users = await User.find({}, "_id first_name last_name");
    return res.json(users);
  } catch (err) {
    console.error("Error fetching user list:", err);
    return res.status(500).send("Internal server error");
  }
});


// Route to fetch photos of a user
app.get("/photosOfUser/:id", requireLogin, async (req, res) => {
  try {
    const userId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).send({ message: "Invalid user ID format" });
    }

    // Default to false if the parameter is not provided
    const includeLikes = req.query.includeLikes === 'true';

    const photos = await Photo.find({ user_id: userId })
      .select("_id user_id file_name date_time comments likes")
      .populate({
        path: "comments.user_id",
        model: "User",
        select: "_id first_name last_name",
      });

    if (!photos.length) {
      return res.status(400).send({ message: "No photos found for this user" });
    }

    const formattedPhotos = photos.map((photo) => {
      const basePhoto = {
        _id: photo._id,
        user_id: photo.user_id,
        file_name: photo.file_name,
        date_time: photo.date_time,
        comments: photo.comments.map((comment) => ({
          _id: comment._id,
          comment: comment.comment,
          date_time: comment.date_time,
          user: {
            _id: comment.user_id?._id,
            first_name: comment.user_id?.first_name,
            last_name: comment.user_id?.last_name,
          },
        })),
      };

      if (includeLikes) {
        basePhoto.likes = photo.likes.length;
        basePhoto.likedByUser = req.session.user && photo.likes.includes(req.session.user._id);
      }

      return basePhoto;
    });

    return res.status(200).json(formattedPhotos);
  } catch (error) {
    console.error("Error fetching photos for user:", error);
    return res.status(500).send({ message: "Server error fetching photos" });
  }
});


// Route to add a comment to a photo with @mentions
app.post("/commentsOfPhoto/:photo_id", requireLogin, async (req, res) => {
  const { photo_id } = req.params;
  const { comment, mentions } = req.body; // Expecting mentions to be an array of user IDs

  if (!comment) {
    return res.status(400).send("Comment cannot be empty");
  }

  try {
    const photo = await Photo.findById(photo_id);
    if (!photo) {
      return res.status(404).send("Photo not found");
    }

    // Validate @mentions
    const validMentions = [];
    if (Array.isArray(mentions)) { // Ensure mentions is an array
      for (const mention of mentions) {
        /* eslint-disable-next-line no-await-in-loop */
        const user = await User.findById(mention);
        if (user) {
          validMentions.push(user._id);
        }
      }
    }

    const newComment = {
      comment: comment,
      user_id: req.session.user._id,
      date_time: new Date(),
      mentions: validMentions,
    };

    photo.comments.push(newComment);
    await photo.save();

    return res.status(200).send("Comment added successfully with mentions");
  } catch (err) {
    console.error("Error adding comment with mentions:", err);
    return res.status(500).send("Internal server error");
  }
});

// Route to fetch photos with @mentions for a specific user
app.get("/photosWithMentions/:userId", requireLogin, async (req, res) => {
  const { userId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).send("Invalid user ID format");
  }

  try {
    const photos = await Photo.find({ "comments.mentions": userId })
      .select("_id user_id file_name date_time comments")
      .populate({
        path: "user_id",
        model: "User",
        select: "first_name last_name"
      });

    if (!photos.length) {
      return res.status(200).send({ message: "No photos found with mentions for this user" });
    }

    const formattedPhotos = photos.map((photo) => ({
      _id: photo._id,
      user: {
        _id: photo.user_id._id,
        first_name: photo.user_id.first_name,
        last_name: photo.user_id.last_name,
      },
      file_name: photo.file_name,
      date_time: photo.date_time,
      comments: photo.comments.filter(comment => comment.mentions.includes(userId))
        .map(comment => ({
          _id: comment._id,
          comment: comment.comment,
          date_time: comment.date_time,
          user: {
            _id: comment.user_id,
            first_name: comment.user_id.first_name,
            last_name: comment.user_id.last_name,
          },
        })),
    }));

    return res.status(200).json(formattedPhotos);
  } catch (err) {
    console.error("Error fetching photos with mentions:", err);
    return res.status(500).send("Internal server error");
  }
});

// Route to get user suggestions for @mentions
app.get("/user/suggestions", requireLogin, async (req, res) => {
  try {
    const users = await User.find({}, "_id first_name last_name");
    return res.json(users);
  } catch (err) {
    console.error("Error fetching user suggestions:", err);
    return res.status(500).send("Internal server error");
  }
});


// Route to fetch a specific user
app.get("/user/:id", async (req, res) => {
  try {
    const userId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).send({ message: "Invalid user ID format" });
    }

    const user = await User.findById(
      userId,
      "_id first_name last_name location description occupation"
    );
    if (!user) {
      return res.status(400).send({ message: "User not found" });
    }
    res.status(200).json(user);
  } catch (error) {
    console.error("Error fetching user:", error);
    return res.status(500).send({ message: "Server error fetching user" });
  }
  return undefined;
});

// Add a comment to a photo
app.post("/commentsOfPhoto/:photo_id", requireLogin, async function (req, res) {
  const { photo_id } = req.params;
  const { comment } = req.body;

  if (!comment) {
    return res.status(400).send("Comment cannot be empty");
  }

  try {
    const photo = await Photo.findById(photo_id);
    if (!photo) {
      return res.status(404).send("Photo not found");
    }

    const newComment = {
      comment: comment,
      user_id: req.session.user._id,
      date_time: new Date(),
    };

    photo.comments.push(newComment);
    await photo.save();

    return res.status(200).send("Comment added successfully");
  } catch (err) {
    return res.status(500).send("Internal server error");
  }
});

app.get("/user/photoUsage/:id", async (req, res) => {
  try {
    const userId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).send({ message: "Invalid user ID format" });
    }

    const photos = await Photo.find({ user_id: userId });

    if (!photos.length) {
      return res.status(200).send({ // Changed 404 to 200
        mostRecentPhoto: null,
        photoWithMostComments: null,
      });
    }

    // Find the most recently uploaded photo
    const mostRecentPhoto = photos.reduce((latest, photo) => {
      return new Date(photo.date_time) > new Date(latest.date_time) ? photo : latest;
    }, photos[0]);

    // Find the photo with the most comments
    const photoWithMostComments = photos.reduce((maxComments, photo) => {
      return photo.comments.length > maxComments.comments.length ? photo : maxComments;
    }, photos[0]);

    const response = {
      mostRecentPhoto: {
        _id: mostRecentPhoto._id,
        file_name: mostRecentPhoto.file_name,
        date_time: mostRecentPhoto.date_time,
      },
      photoWithMostComments: {
        _id: photoWithMostComments._id,
        file_name: photoWithMostComments.file_name,
        commentsCount: photoWithMostComments.comments.length,
      },
    };

    res.status(200).json(response);
  } catch (err) {
    console.error("Error fetching photo usage details:", err);
    res.status(500).send({ message: "Internal server error" });
  }
  return undefined;
});


// Delete a Photo
app.delete('/deletePhoto/:id', async (req, res) => {
  const photoIdToDelete = req.params.id;
  const userId = req.session.user._id;

  try {
      const photo = await Photo.findById(photoIdToDelete);
      if (!photo) {
          return res.status(404).json({ message: 'Photo not found' });
      }

      if (photo.user_id.toString() !== userId) {
          return res.status(403).json({ message: 'You are not authorized to delete this photo' });
      }

      fs.unlinkSync(`./images/${photo.file_name}`);
      await Photo.findByIdAndDelete(photoIdToDelete);

      return res.status(200).json({ message: 'Photo deleted successfully!' });
  } catch (error) {
      console.error('Error deleting photo:', error.message);
      return res.status(500).json({ message: 'Internal server error' });
  }
});

// Delete a comment
app.delete('/deleteComment/:id', async (req, res) => {
  const commentIdToDelete = req.params.id;
  const photoID = req.body.photo_id;
  const userId = req.session.user._id;

  try {
      const photo = await Photo.findById(photoID);
      if (!photo) {
          return res.status(404).json({ message: 'Photo not found' });
      }

      const commentToDelete = photo.comments.find(
          (comment) => comment._id.toString() === commentIdToDelete
      );
      if (!commentToDelete) {
          return res.status(404).json({ message: 'Comment not found' });
      }

      if (commentToDelete.user_id.toString() !== userId) {
          return res.status(403).json({ message: 'You are not authorized to delete this comment' });
      }

      const updatedPhoto = await Photo.findByIdAndUpdate(
          photoID,
          { $pull: { comments: { _id: commentToDelete._id } } },
          { new: true }
      );

      return res.status(200).json({ message: 'Comment deleted successfully!', updatedPhoto });
  } catch (error) {
      console.error('Error deleting comment:', error.message);
      return res.status(500).json({ message: 'Internal server error' });
  }
});

// Delete the user
app.delete('/deleteUser/:id', async (req, res) => {
  const userIdToRemove = req.params.id;
  const loggedInUserId = req.session.user._id;

  if (userIdToRemove !== loggedInUserId) {
      return res.status(403).json({ message: 'You are not authorized to delete this account' });
  }

  try {
      const deletedUser = await User.findByIdAndDelete(userIdToRemove);
      if (!deletedUser) {
          return res.status(404).json({ message: 'User not found' });
      }

      const userPhotos = await Photo.find({ user_id: userIdToRemove });
      const photoDeletionPromises = userPhotos.map((photo) => {
          fs.unlinkSync(`./images/${photo.file_name}`);
          return Photo.findByIdAndDelete(photo._id);
      });
      await Promise.all(photoDeletionPromises);

      await Photo.updateMany(
          {},
          {
              $pull: {
                  comments: { user_id: userIdToRemove },
                  likes: userIdToRemove,
              },
          }
      );

      return new Promise((resolve, reject) => {
          req.session.destroy((err) => {
              if (err) {
                  console.error('Error destroying session:', err);
                  reject(res.status(500).json({ message: 'Error logging out user' }));
              } else {
                  res.clearCookie('connect.sid'); // Clear session cookie
                  resolve(res.status(200).json({ message: 'User and associated data deleted successfully!' }));
              }
          });
      });
  } catch (error) {
      console.error('Error deleting user:', error.message);
      return res.status(500).json({ message: 'Internal server error' });
  }
});

// Current user
app.get('/currentUser', (req, res) => {
  if (!req.session.user) {
      return res.status(401).json({ message: 'Unauthorized' });
  }

  return res.status(200).json(req.session.user);
});



// Start the server
const server = app.listen(3000, () => {
  console.log(`Listening on http://localhost:${server.address().port}`);
});
