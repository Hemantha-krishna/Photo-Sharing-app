/**
 * This Node.js program loads the Project 7 model data into Mongoose
 * defined objects in a MongoDB database. It can be run with the command:
 *     node loadDatabase.js
 * Be sure to have an instance of the MongoDB running on the localhost.
 *
 * This script loads the data into the MongoDB database named 'project6'.
 * It loads into collections named User and Photos. The Comments are added in
 * the Photos of the comments. Any previous objects in those collections are
 * discarded.
 */

const mongoose = require("mongoose");
mongoose.Promise = require("bluebird");
mongoose.set("strictQuery", false);
mongoose.connect("mongodb://127.0.0.1/project6", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Get the models and required dependencies
const models = require("./modelData/photoApp.js").models;
const User = require("./schema/user.js");
const Photo = require("./schema/photo.js");
const SchemaInfo = require("./schema/schemaInfo.js");
const { makePasswordEntry } = require("./password");

const versionString = "1.0";

// Remove existing collections
const removePromises = [
  User.deleteMany({}),
  Photo.deleteMany({}),
  SchemaInfo.deleteMany({}),
];

Promise.all(removePromises)
  .then(function () {
    // Load users into the User collection
    const userModels = models.userListModel();
    const mapFakeId2RealId = {};

    const userPromises = userModels.map(function (user) {
      const passwordEntry = makePasswordEntry("weak"); // Generate salt and hash
      return User.create({
        first_name: user.first_name,
        last_name: user.last_name,
        location: user.location,
        description: user.description,
        occupation: user.occupation,
        login_name: user.last_name.toLowerCase(),
        password_digest: passwordEntry.hash, // Store hash
        salt: passwordEntry.salt, // Store salt
      })
        .then(function (userObj) {
          // Map the generated MongoDB _id to the fake ID
          mapFakeId2RealId[user._id] = userObj._id;
          user.objectID = userObj._id;
          console.log(
            "Adding user:",
            user.first_name + " " + user.last_name,
            " with ID ",
            user.objectID
          );
        })
        .catch(function (err) {
          console.error("Error creating user:", err);
        });
    });

    const allPromises = Promise.all(userPromises).then(function () {
      // Load photos into the Photo collection
      const photoModels = [];
      const userIDs = Object.keys(mapFakeId2RealId);

      userIDs.forEach(function (id) {
        photoModels.push(...models.photoOfUserModel(id));
      });

      const photoPromises = photoModels.map(function (photo) {
        return Photo.create({
          file_name: photo.file_name,
          date_time: photo.date_time,
          user_id: mapFakeId2RealId[photo.user_id],
        })
          .then(function (photoObj) {
            photo.objectID = photoObj._id;
            if (photo.comments) {
              photo.comments.forEach(function (comment) {
                photoObj.comments = photoObj.comments.concat([
                  {
                    comment: comment.comment,
                    date_time: comment.date_time,
                    user_id: comment.user.objectID,
                  },
                ]);
                console.log(
                  "Adding comment of length %d by user %s to photo %s",
                  comment.comment.length,
                  comment.user.objectID,
                  photo.file_name
                );
              });
            }
            photoObj.save();
            console.log(
              "Adding photo:",
              photo.file_name,
              " of user ID ",
              photoObj.user_id
            );
          })
          .catch(function (err) {
            console.error("Error creating photo:", err);
          });
      });

      return Promise.all(photoPromises).then(function () {
        // Create the SchemaInfo object
        return SchemaInfo.create({
          version: versionString,
        })
          .then(function (schemaInfo) {
            console.log(
              "SchemaInfo object created with version ",
              schemaInfo.version
            );
          })
          .catch(function (err) {
            console.error("Error creating schemaInfo:", err);
          });
      });
    });

    allPromises.then(function () {
      mongoose.disconnect();
    });
  })
  .catch(function (err) {
    console.error("Error during database initialization:", err);
  });
