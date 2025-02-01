import React, { useEffect, useState } from "react";
import { AppBar, Toolbar, Typography, Button, Modal, Box } from "@mui/material";
import axios from "axios";
import UploadPhoto from "../UploadPhoto";
import "./styles.css";

function TopBar({ userName, isLoggedIn, onLogout }) {
  const [version, setVersion] = useState("");
  const [showUploadModal, setShowUploadModal] = useState(false);

  useEffect(() => {
    // Only fetch the version when the user is logged in
    if (isLoggedIn) {
      axios
        .get("http://localhost:3000/test/info")
        .then((response) => {
          setVersion(response.data.version);
        })
        .catch((err) => {
          console.error(
            "Failed to fetch version info:",
            err.response?.statusText || err.message
          );
        });
    }
  }, [isLoggedIn]); // This will re-run the effect whenever isLoggedIn changes

  const handleLogout = () => {
    if (onLogout) {
      onLogout(); // Call the logout handler passed from PhotoShare
    }
  };

  return (
    <AppBar className="topbar-appBar" position="absolute">
      <Toolbar>
        <Typography variant="h5" color="inherit" style={{ flexGrow: 1 }}>
          VS & HC
        </Typography>

        {isLoggedIn && version && (
          <Typography variant="h6" color="inherit" className="version-text">
            Version {version}
          </Typography>
        )}

        {isLoggedIn ? (
          <>
            <Button color="inherit" onClick={() => setShowUploadModal(true)}>
              Add Photo
            </Button>
            <div>
              <Typography variant="h6" color="inherit">
                Hi {userName}
              </Typography>
              <Button color="inherit" onClick={handleLogout}>
                Logout
              </Button>
            </div>
          </>
        ) : (
          <Typography variant="h6" color="inherit">
            Please Login
          </Typography>
        )}
      </Toolbar>

      {/* Modal for UploadPhoto */}
      <Modal
        open={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        aria-labelledby="upload-photo-modal"
        aria-describedby="upload-photo-description"
      >
        <Box className="upload-photo-modal">
          <UploadPhoto onClose={() => setShowUploadModal(false)} />
        </Box>
      </Modal>
    </AppBar>
  );
}

export default TopBar;
