import React, { useEffect, useState } from "react";
import { Typography, Card, CardContent, Grid, CardMedia, Button, IconButton, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from "@mui/material";
import { ThumbUp, ThumbDown } from "@mui/icons-material";
import { Link } from "react-router-dom";
import axios from "axios";
import { MentionsInput, Mention } from 'react-mentions';
import "./styles.css";

function UserPhotos({ userId }) {
  const [photos, setPhotos] = useState([]);
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState({});
  const [mentionUsers, setMentionUsers] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [loggedInUserId, setLoggedInUserId] = useState(null);
  const [openDeletePhotoDialog, setOpenDeletePhotoDialog] = useState(false); 


  useEffect(() => {

    // Fetch the logged-in user information
    const fetchLoggedInUser = async () => {
      try {
          const response = await axios.get("/currentUser"); // Adjust API route as necessary
          setLoggedInUserId(response.data._id); // Set the logged-in user ID
      } catch (err) {
          console.error("Error fetching logged-in user:", err);
      }
  };

  fetchLoggedInUser();

    const fetchData = async () => {
      try {
        // Updated API call to include likes and likedByUser fields
        const photosResponse = await axios.get(`/photosOfUser/${userId}?includeLikes=true`);
        const sortedPhotos = photosResponse.data.sort((a, b) => {
          if (b.likes === a.likes) {
            return new Date(b.date_time) - new Date(a.date_time);
          }
          return b.likes - a.likes;
        });
        setPhotos(sortedPhotos);
  
        const userResponse = await axios.get(`/user/${userId}`);
        setUser(userResponse.data);
  
        const mentionsResponse = await axios.get('/user/suggestions');
        setMentionUsers(mentionsResponse.data);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };
  
    fetchData();
  }, [userId]);  

  const handleCommentChange = (photoId, value) => {
    setComments({
      ...comments,
      [photoId]: value,
    });
  };

  const handleCommentSubmit = async (photoId) => {
    if (!comments[photoId]) {
      return;
    }

    const mentions = []; // Extract mentioned user IDs from the comment
    const regex = /@\[([^\]]+)\]\(([^)]+)\)/g;
    let match;
    do {
      match = regex.exec(comments[photoId]);
      if (match) {
        mentions.push(match[2]);
      }
    } while (match !== null);


    try {
      await axios.post(`/commentsOfPhoto/${photoId}`, { comment: comments[photoId], mentions });
      setPhotos((prevPhotos) => {
        const updatedPhotos = prevPhotos.map((photo) => {
          if (photo._id === photoId) {
            return {
              ...photo,
              comments: [
                ...photo.comments,
                {
                  _id: new Date().getTime(),
                  comment: comments[photoId],
                  user: {
                    _id: user._id,
                    first_name: user.first_name,
                    last_name: user.last_name,
                  },
                  date_time: new Date(),
                },
              ],
            };
          }
          return photo;
        });
        return updatedPhotos;
      });
      setComments({
        ...comments,
        [photoId]: "",
      });
    } catch (err) {
      setError("Failed to add comment");
    }
  };

  const handleLike = async (photoId, likedByUser) => {
    try {
      const url = likedByUser ? `/photos/${photoId}/unlike` : `/photos/${photoId}/like`;
      const response = await axios.post(url);
      setPhotos((prevPhotos) => {
        return prevPhotos.map((photo) => {
          if (photo._id === photoId) {
            return {
              ...photo,
              likes: response.data.likes,
              likedByUser: !likedByUser,
            };
          }
          return photo;
        });
      });
    } catch (err) {
      console.error("Error updating like status:", err);
      setError("Failed to update like status");
    }
  };

  const getCommentText = (comment) => {
    return comment.replace(/@\[(.+?)\]\((.+?)\)/g, (match, display, id) => {
      const mentionedUser = mentionUsers.find(u => u._id === id);
      return mentionedUser ? `<span class="mention">${display}</span>` : display;
    });
  };  

  if (loading) {
    return <Typography variant="body1">Loading...</Typography>;
  }

  if (error) {
    return (
      <Typography variant="body1" color="error">
        Error fetching data: {error.response?.statusText || "Unknown error"}
      </Typography>
    );
  }

// Delete a Photo
  const handleDeletePhoto = async (photoId) => {
    console.log(`Deleting photo with ID: ${photoId}`);
  
    try {
      await axios.delete(`/deletePhoto/${photoId}`);
  
      // Update state to remove the deleted photo
      setPhotos((prevPhotos) => prevPhotos.filter((photo) => photo._id !== photoId));
    
    } catch (deleteErr) {
      console.error("Error deleting photo:", deleteErr);
      setError(deleteErr);
    }
  };
  
// Delete a Comment
  const handleDeleteComment = async (photoId, commentId) => {
    console.log(`Deleting comment with ID: ${commentId}`);
  
    try {
      await axios.delete(`/deleteComment/${commentId}`, {
        data: { photo_id: photoId }, // Pass the photo ID in the request body
      });
  
      setPhotos((prevPhotos) =>prevPhotos.map((photo) => {
          if (photo._id === photoId) {
            return {
              ...photo,
              comments: photo.comments.filter((comment) => comment._id !== commentId),
            };
          }
          return photo;
        })
      );
    } catch (deleteErr) {
      console.error("Error deleting comment:", deleteErr);
      setError(deleteErr);
    }
  };
  // Delete the user
  const handleDeleteUser = async (userIdToRemove) => {
    console.log(`Deleting user with ID: ${userIdToRemove}`);
    if (!userIdToRemove || typeof userIdToRemove !== 'string') {
        console.error('Invalid userId:', userIdToRemove);
        return;
    }

    try {
        await axios.delete(`/deleteUser/${userIdToRemove}`);
        console.log(`User deleted successfully:' ${userIdToRemove}`);
        window.location.href = '/login'; // Redirect user after deletion
    } catch (deleteErr) {
      console.error("Error deleting user:", deleteErr);
      setError(deleteErr);
    }
};


  return (
    <div className="user-photos-container">
      <Typography variant="h5" gutterBottom>
        Photos of {user ? `${user.first_name} ${user.last_name}` : "Unknown User"}
      </Typography>
      <Grid container spacing={2}>
        {photos.length > 0 ? (
          photos.map((photo) => (
            <Grid item xs={12} sm={6} md={4} key={photo._id}>
              <Card className="photo-card">
                <CardMedia
                  component="img"
                  alt="User Photo"
                  height="200"
                  image={`../../images/${photo.file_name}`}
                />
                <CardContent>
                  <Typography variant="body2" color="textSecondary">
                    {new Date(photo.date_time).toLocaleString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </Typography>
                  <div className="like-button">
                    <IconButton
                      color={photo.likedByUser ? "primary" : "default"}
                      onClick={() => handleLike(photo._id, photo.likedByUser)}
                    >
                      {photo.likedByUser ? <ThumbDown /> : <ThumbUp />}
                    </IconButton>
                    <Typography variant="body2">{photo.likes} likes</Typography>
                  </div>
                  <Typography variant="body1">Comments:</Typography>
                  <div className="comment-section"> {/* Add scrollable section */}
                  {photo.comments && photo.comments.length > 0 ? (
                    photo.comments.map((comment) => (
                      <div key={comment._id} className="comment">
                        <Typography variant="caption">
                          <Link to={`/users/${comment.user._id}`} className="commenter-link">
                            <strong>{comment.user.first_name} {comment.user.last_name}: </strong>
                          </Link>
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {/* eslint-disable-next-line react/no-danger */}
                          <span dangerouslySetInnerHTML={{ __html: getCommentText(comment.comment) }} />
                        </Typography>
                        <div className="comment-date">
                          <Typography variant="caption" color="textSecondary">
                            {new Date(comment.date_time).toLocaleString("en-US", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </Typography>
                        </div>
                        {comment.user._id === loggedInUserId && (
            <Button
                  variant="contained"
                  color="error"
                  onClick={() => handleDeleteComment(photo._id, comment._id)}
              >
                Delete Comment
            </Button>
        )}
                      </div>
                    ))
                  ) : (
                    <Typography variant="body2">No comments available.</Typography>
                  )}
                  </div> {/* End of scrollable section */}
                  <div className="add-comment">
                    <MentionsInput
                      value={comments[photo._id] || ""}
                      onChange={(e) => handleCommentChange(photo._id, e.target.value)}
                      markup="@\[__display__\](__id__)"
                      style={{ width: '100%' }}
                      placeholder="Add a comment..." // Add placeholder text
                      className="mentions-textbox" // Add class for custom styling
                    >
                      <Mention
                        trigger="@"
                        data={mentionUsers.map(mentionUser => ({
                          id: mentionUser._id,
                          display: `${mentionUser.first_name} ${mentionUser.last_name}`,
                        }))}
                        style={{ backgroundColor: '#daf4fa' }}
                      />
                    </MentionsInput>
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={() => handleCommentSubmit(photo._id)}
                      disabled={!comments[photo._id]}
                    >
                      Submit
                    </Button>

                    {photo.user_id === loggedInUserId && (
  <>
    <Button
      variant="contained"
      color="error"
      onClick={() => setOpenDeletePhotoDialog(true)} // Open Delete Photo dialog
    >
      Delete Photo
    </Button>

    <Dialog
      open={openDeletePhotoDialog}
      onClose={() => setOpenDeletePhotoDialog(false)} // Close dialog
    >
      <DialogTitle>Delete Photo</DialogTitle>
      <DialogContent>
        <DialogContentText>
          Are you sure you want to delete this photo? This action cannot be undone.
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setOpenDeletePhotoDialog(false)} color="primary">
          Cancel
        </Button>
        <Button
          onClick={() => {
            handleDeletePhoto(photo._id); // Delete photo
            setOpenDeletePhotoDialog(false); // Close dialog after deletion
          }}
          color="error"
        >
          Confirm
        </Button>
      </DialogActions>
    </Dialog>
  </>
)}


                  </div>
                </CardContent>
              </Card>
            </Grid>
          ))
        ) : (
          <Grid item xs={12}>
            <Typography variant="body2">No photos available.</Typography>
          </Grid>
        )}
      </Grid>

      {loggedInUserId === userId && (
  <>
    <Button
      variant="contained"
      color="secondary"
      onClick={() => setOpenDialog(true)} // Open dialog when the button is clicked
    >
      Delete Account
    </Button>

    <Dialog
      open={openDialog}
      onClose={() => setOpenDialog(false)} // Ensure the dialog closes when clicking outside or pressing Esc
    >
      <DialogTitle>Delete Account</DialogTitle>
      <DialogContent>
        <DialogContentText>
          Are you sure you want to delete your account? This action cannot be undone.
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button
          onClick={() => setOpenDialog(false)} // Close dialog on Cancel button click
          color="primary"
        >
          Cancel
        </Button>
        <Button
          onClick={() => {
            handleDeleteUser(loggedInUserId); // Delete account on Confirm
            setOpenDialog(false); // Close dialog after deletion
          }}
          color="error"
        >
          Delete Account
        </Button>
      </DialogActions>
    </Dialog>
  </>
)}


    </div>
  );
}

export default UserPhotos;
