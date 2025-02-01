import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom/client";
import { Grid, Paper } from "@mui/material";
import {
  HashRouter,
  Route,
  Routes,
  Navigate,
  useParams,
} from "react-router-dom";

import "./styles/main.css";
import TopBar from "./components/TopBar";
import UserDetail from "./components/UserDetail";
import UserList from "./components/UserList";
import UserPhotos from "./components/UserPhotos";
import LoginRegister from "./components/LoginRegister";
import UploadPhoto from "./components/UploadPhoto";

function UserDetailRoute() {
  const { userId } = useParams();
  return <UserDetail userId={userId} />;
}

function UserPhotosRoute() {
  const { userId } = useParams();
  return <UserPhotos userId={userId} />;
}

function PhotoShare() {
  const [isLoggedIn, setIsLoggedIn] = useState(
    Boolean(sessionStorage.getItem("user"))
  );
  const [loggedInUser, setLoggedInUser] = useState(
    isLoggedIn ? JSON.parse(sessionStorage.getItem("user")) : null
  );

  // Update login state dynamically when user logs in
  const handleLogin = () => {
    const user = JSON.parse(sessionStorage.getItem("user"));
    setLoggedInUser(user);
    setIsLoggedIn(true);
  };

  // Handle logout and update states accordingly
  const handleLogout = () => {
    sessionStorage.removeItem("user");
    setLoggedInUser(null);
    setIsLoggedIn(false);
  };

  // Watch for session storage changes (to handle changes from other windows/tabs)
  useEffect(() => {
    // Initial check when component mounts
    const user = sessionStorage.getItem("user");
    setLoggedInUser(user ? JSON.parse(user) : null);
    setIsLoggedIn(Boolean(user));

    // Listen for changes from other windows/tabs
    const onStorageChange = () => {
      // const user = sessionStorage.getItem("user");
      setLoggedInUser(user ? JSON.parse(user) : null);
      setIsLoggedIn(Boolean(user));
    };

    window.addEventListener("storage", onStorageChange);

    // Cleanup event listener on unmount
    return () => window.removeEventListener("storage", onStorageChange);
  }, []); // Empty array means this effect only runs once on component mount

  return (
    <HashRouter>
      <div>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TopBar
              userName={loggedInUser?.first_name}
              isLoggedIn={isLoggedIn}
              onLogout={handleLogout}
            />
          </Grid>
          <div className="main-topbar-buffer" />
          {isLoggedIn && (
            <Grid item sm={3}>
              <Paper className="main-grid-item">
                <UserList />
              </Paper>
            </Grid>
          )}
          <Grid item sm={isLoggedIn ? 9 : 12}>
            <Paper className="main-grid-item">
              <Routes>
                {/* Route for Login/Register */}
                <Route
                  path="/login-register"
                  element={
                    isLoggedIn ? (
                      <Navigate to="/users/" />
                    ) : (
                      <LoginRegister onLogin={handleLogin} />
                    )
                  }
                />
                {/* Route for Upload Photo */}
                <Route
                  path="/upload-photo"
                  element={
                    isLoggedIn ? (
                      <UploadPhoto />
                    ) : (
                      <Navigate to="/login-register" />
                    )
                  }
                />
                {/* Route for User Details */}
                <Route
                  path="/users/:userId"
                  element={
                    isLoggedIn ? (
                      <UserDetailRoute />
                    ) : (
                      <Navigate to="/login-register" />
                    )
                  }
                />
                {/* Route for User Photos */}
                <Route
                  path="/photos/:userId"
                  element={
                    isLoggedIn ? (
                      <UserPhotosRoute />
                    ) : (
                      <Navigate to="/login-register" />
                    )
                  }
                />
                {/* Route for Users List */}
                <Route
                  path="/users/"
                  element={
                    isLoggedIn ? (
                      <UserList />
                    ) : (
                      <Navigate to="/login-register" />
                    )
                  }
                />
                {/* Default redirect if no match */}
                <Route path="*" element={<Navigate to="/login-register" />} />
              </Routes>
            </Paper>
          </Grid>
        </Grid>
      </div>
    </HashRouter>
  );
}

const root = ReactDOM.createRoot(document.getElementById("photoshareapp"));
root.render(<PhotoShare />);
