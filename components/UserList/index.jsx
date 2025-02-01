import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Divider,
  List,
  ListItem,
  ListItemText,
  Typography,
  Paper,
} from "@mui/material";
import axios from "axios"; // Import axios
import "./styles.css";

function UserList() {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState(null); // State to handle errors
  const navigate = useNavigate();

  useEffect(() => {
    const getUsers = async () => {
      try {
        const response = await axios.get("/user/list"); // Use axios to fetch user list
        setUsers(response.data); // Update state with the fetched users
      } catch (err) {
        setError(err); // Set error if the fetch fails
      }
    };

    getUsers();
  }, []);

  return (
    <div className="user-list-container">
      <Typography variant="h6" className="user-list-header">
        User List
      </Typography>
      {error && (
        <Typography variant="body2" color="error">
          {/* Error fetching user list: {error.response?.statusText || "Unknown error"} */}
        </Typography>
      )}
      {/* Display the list of users */}
      <List component="nav">
        {users.map((user) => (
          <React.Fragment key={user._id}>
            <Paper
              elevation={3}
              className="user-card"
              onClick={() => navigate(`/users/${user._id}`)}
            >
              <ListItem button>
                <ListItemText
                  primary={`${user.first_name} ${user.last_name}`}
                  secondary={user.occupation}
                />
              </ListItem>
            </Paper>
            <Divider />
          </React.Fragment>
        ))}
      </List>
    </div>
  );
}

export default UserList;
