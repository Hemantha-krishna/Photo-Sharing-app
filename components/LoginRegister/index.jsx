import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./styles.css";

function LoginRegister({ onLogin }) {
  const [loginName, setLoginName] = useState("");
  const [password, setPassword] = useState("");
  const [registerInfo, setRegisterInfo] = useState({
    login_name: "",
    registerPassword: "",
    confirmPassword: "",
    first_name: "",
    last_name: "",
    location: "",
    description: "",
    occupation: "",
  });
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [showRegister, setShowRegister] = useState(false); 
  const navigate = useNavigate();

  // Handle login
  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post("/admin/login", {
        login_name: loginName,
        password,
      });
      if (response.status === 200) {
        const user = response.data;
        sessionStorage.setItem("user", JSON.stringify(user));
        onLogin(); 
        navigate(`/users/${user._id}`);
      }
    } catch (err) {
      setError("Login failed. Please check your login name and password.");
    }
  };

  // Handle registration
  const handleRegister = async (e) => {
    e.preventDefault();
    const { registerPassword, confirmPassword } = registerInfo;

    if (registerPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      const response = await axios.post("/user", {
        ...registerInfo,
        password: registerPassword,
      });
      if (response.status === 200) {
        setSuccessMessage("Registration successful!");
        setRegisterInfo({
          login_name: "",
          registerPassword: "",
          confirmPassword: "",
          first_name: "",
          last_name: "",
          location: "",
          description: "",
          occupation: "",
        });
        setShowRegister(false); 
      }
    } catch (err) {
      setError(err.response?.data || "Registration failed. Please try again.");
    }
  };

  return (
    <div className="login-register">
      <h2>Login</h2>
      <form onSubmit={handleLogin}>
        <input
          type="text"
          value={loginName}
          onChange={(e) => setLoginName(e.target.value)}
          placeholder="Login Name"
          required
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          required
        />
        <button type="submit">Login</button>
      </form>

      {!showRegister && (
        <button onClick={() => setShowRegister(true)}>Register</button>
      )}

      {showRegister && (
        <div className="register-form">
          <h2>Register</h2>
          <form onSubmit={handleRegister}>
            <input
              type="text"
              value={registerInfo.login_name}
              onChange={(e) => setRegisterInfo((prev) => ({...prev, login_name: e.target.value,}))}
              placeholder="Login Name"
              required
            />
            <input
              type="password"
              value={registerInfo.registerPassword}
              onChange={(e) => setRegisterInfo((prev) => ({...prev, registerPassword: e.target.value,}))}
              placeholder="Password"
              required
            />
            <input
              type="password"
              value={registerInfo.confirmPassword}
              onChange={(e) => setRegisterInfo((prev) => ({...prev, confirmPassword: e.target.value,}))}
              placeholder="Confirm Password"
              required
            />
            <input
              type="text"
              value={registerInfo.first_name}
              onChange={(e) => setRegisterInfo((prev) => ({...prev, first_name: e.target.value,}))}
              placeholder="First Name"
              required
            />
            <input
              type="text"
              value={registerInfo.last_name}
              onChange={(e) => setRegisterInfo((prev) => ({...prev, last_name: e.target.value,}))}
              placeholder="Last Name"
              required
            />
            <input
              type="text"
              value={registerInfo.location}
              onChange={(e) => setRegisterInfo((prev) => ({...prev, location: e.target.value,}))}
              placeholder="Location"
            />
            <input
              type="text"
              value={registerInfo.description}
              onChange={(e) => setRegisterInfo((prev) => ({...prev, description: e.target.value,}))}
              placeholder="Description"
            />
            <input
              type="text"
              value={registerInfo.occupation}
              onChange={(e) => setRegisterInfo((prev) => ({...prev, occupation: e.target.value,}))}
              placeholder="Occupation"
            />
            <button type="submit">Register Me</button>
            <button type="button" onClick={() => setShowRegister(false)}>
              Cancel
            </button>
          </form>
        </div>
      )}

      {error && <p className="error">{error}</p>}
      {successMessage && <p className="success">{successMessage}</p>}
    </div>
  );
}

export default LoginRegister;
