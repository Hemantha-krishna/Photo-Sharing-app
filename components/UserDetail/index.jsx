import React, { useEffect, useState } from "react";
import { Typography, Card, CardContent, Grid, Button, CardMedia } from "@mui/material";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import "./styles.css";

function UserDetail({ userId }) {
  const [user, setUser] = useState(null);
  const [photoUsage, setPhotoUsage] = useState(null);
  const [mentionPhotos, setMentionPhotos] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const userResponse = await axios.get(`/user/${userId}`);
        const photoUsageResponse = await axios.get(`/user/photoUsage/${userId}`);
        const mentionPhotosResponse = await axios.get(`/photosWithMentions/${userId}`);

        setUser(userResponse.data);
        setPhotoUsage(photoUsageResponse.data);
        setMentionPhotos(mentionPhotosResponse.data);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [userId]);

  if (loading) {
    return <Typography variant="body1">Loading...</Typography>;
  }

  if (error) {
    return (
      <Typography variant="body1" color="error">
        Error fetching user details: {error.response?.statusText || "Unknown error"}
      </Typography>
    );
  }

  return (
    <Card className="user-detail-card">
      <CardContent>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Typography variant="h5">
              {user.first_name} {user.last_name}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              {user.occupation}
            </Typography>
          </Grid>
          <Grid item xs={12}>
            <Typography variant="body1">
              <strong>Location:</strong> {user.location}
            </Typography>
            <Typography variant="body1">
              <strong>Description:</strong> {user.description}
            </Typography>
          </Grid>
          {photoUsage ? (
            <>
              <Grid item xs={12}>
                <Typography variant="body1">
                  <strong>Most Recently Uploaded Photo:</strong>
                </Typography>
                {photoUsage.mostRecentPhoto ? (
                  <>
                    <CardMedia
                      component="img"
                      image={`/images/${photoUsage.mostRecentPhoto.file_name}`}
                      alt="Most Recent Photo"
                      onClick={() => navigate(`/photos/${userId}?photo=${photoUsage.mostRecentPhoto._id}`)}
                      style={{ width: "250px", height: "auto", cursor: "pointer", objectFit: "cover" }}
                    />
                    <Typography variant="body2" color="textSecondary">
                      Uploaded on: {new Date(photoUsage.mostRecentPhoto.date_time).toLocaleString()}
                    </Typography>
                  </>
                ) : (
                  <Typography variant="body2">No recent photos available.</Typography>
                )}
              </Grid>
              <Grid item xs={12}>
                <Typography variant="body1">
                  <strong>Photo with Most Comments:</strong>
                </Typography>
                {photoUsage.photoWithMostComments ? (
                  <>
                    <CardMedia
                      component="img"
                      image={`/images/${photoUsage.photoWithMostComments.file_name}`}
                      alt="Photo with Most Comments"
                      onClick={() => navigate(`/photos/${userId}?photo=${photoUsage.photoWithMostComments._id}`)}
                      style={{ width: "250px", height: "auto", cursor: "pointer", objectFit: "cover" }}
                    />
                    <Typography variant="body2" color="textSecondary">
                      Comments: {photoUsage.photoWithMostComments.commentsCount}
                    </Typography>
                  </>
                ) : (
                  <Typography variant="body2">No photos with comments available.</Typography>
                )}
              </Grid>
            </>
          ) : (
            <Typography variant="body2">No photos available.</Typography>
          )}
          <Grid item xs={12}>
            <Typography variant="body1">
              <strong>Photos where {user.first_name} is @mentioned:</strong>
            </Typography>
            {mentionPhotos.length > 0 ? (
              mentionPhotos.map((photo) => (
                <Card key={photo._id} className="mention-photo-card">
                  <CardMedia
                    component="img"
                    image={`/images/${photo.file_name}`}
                    alt="Mention Photo"
                    onClick={() => navigate(`/photos/${photo.user._id}?photo=${photo._id}`)}
                    style={{ width: "100px", height: "auto", cursor: "pointer", objectFit: "cover" }}
                  />
                  <CardContent>
                    <Typography variant="body2" color="textSecondary">
                      Photo by{" "}
                      <Link to={`/users/${photo.user._id}`} className="commenter-link">
                        <strong>{photo.user.first_name} {photo.user.last_name}</strong>
                      </Link>
                    </Typography>
                    {photo.comments.map(comment => (
                      <Typography key={comment._id} variant="body2" color="textSecondary">
                        Mentioned in comments on: {new Date(comment.date_time).toLocaleString()}
                      </Typography>
                    ))}
                  </CardContent>
                </Card>
              ))
            ) : (
              <Typography variant="body2">No mentions found.</Typography>
            )}
          </Grid>
          <Grid item xs={12}>
            <Link to={`/photos/${userId}`} style={{ textDecoration: "none" }}>
              <Button variant="contained" color="primary" className="view-photos-button">
                View All Photos
              </Button>
            </Link>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
}

export default UserDetail;
