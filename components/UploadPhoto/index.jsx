import React, { useRef, useState } from "react";
import { Button, Typography } from "@mui/material";
import axios from "axios";
import { useNavigate } from "react-router-dom";

function UploadPhoto() {
  const fileInputRef = useRef(null);
  const [statusMessage, setStatusMessage] = useState("");
  const navigate = useNavigate();

  const handleUpload = async (e) => {
    e.preventDefault();

    if (!fileInputRef.current.files[0]) {
      setStatusMessage("Please select a file to upload.");
      return;
    }

    const formData = new FormData();
    formData.append("uploadedphoto", fileInputRef.current.files[0]);

    const user = JSON.parse(sessionStorage.getItem("user"));

    try {
      await axios.post("/photos/new", formData);
      setStatusMessage("Photo uploaded successfully.");
      navigate(`/photos/${user._id}`);
    } catch (err) {
      setStatusMessage("Failed to upload photo.");
    }
  };

  return (
    <div className="upload-photo-container">
      <Typography variant="h6">Upload a New Photo</Typography>
      <input type="file" accept="image/*" ref={fileInputRef} />
      <Button variant="contained" color="primary" onClick={handleUpload}>
        Upload Photo
      </Button>
      {statusMessage && (
        <Typography
          className={`status-message ${
            statusMessage.includes("Failed") ? "error" : ""
          }`}
        >
          {statusMessage}
        </Typography>
      )}
    </div>
  );
}

export default UploadPhoto;
