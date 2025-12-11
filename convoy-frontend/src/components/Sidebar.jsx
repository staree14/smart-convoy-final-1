import { useState } from "react";
import { Drawer, List, ListItemButton, ListItemText, IconButton, Box } from "@mui/material";
import { Link } from "react-router-dom";
import MenuIcon from "@mui/icons-material/Menu";
import CloseIcon from "@mui/icons-material/Close";
import DashboardIcon from "@mui/icons-material/Dashboard";
import RouteIcon from "@mui/icons-material/Route";
import HistoryIcon from "@mui/icons-material/History";
import AnalyticsIcon from "@mui/icons-material/Analytics";

export default function Sidebar() {
  const [open, setOpen] = useState(false);

  const toggleDrawer = () => {
    setOpen(!open);
  };

  const menuItems = [
    { label: "Dashboard", path: "/dashboard", icon: <DashboardIcon /> },
    { label: "AI Route Planning", path: "/create-convoy", icon: <RouteIcon /> },
    { label: "Convoy History", path: "/history", icon: <HistoryIcon /> },
    { label: "View Route", path: "/route/demo", icon: <RouteIcon /> },
  ];

  return (
    <>
      {/* Hamburger Menu Button - Only visible when sidebar is closed */}
      {!open && (
        <IconButton
          onClick={toggleDrawer}
          sx={{
            position: "fixed",
            top: 15,
            left: 15,
            zIndex: 1300,
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            color: "white",
            "&:hover": {
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              opacity: 0.9,
            },
            width: 50,
            height: 50,
            borderRadius: "8px",
            boxShadow: "0 4px 12px rgba(102, 126, 234, 0.3)",
          }}
        >
          <MenuIcon sx={{ fontSize: "1.8em" }} />
        </IconButton>
      )}

      {/* Sidebar Drawer */}
      <Drawer
        anchor="left"
        open={open}
        onClose={toggleDrawer}
        sx={{
          "& .MuiDrawer-paper": {
            background: "linear-gradient(180deg, #f8f9ff 0%, #f0f3ff 100%)",
            boxShadow: "2px 0 8px rgba(0, 0, 0, 0.1)",
            marginTop: 0,
            paddingTop: 2,
          },
        }}
      >
        {/* Sidebar Header with Close Button */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "1rem",
            borderBottom: "2px solid #e0e7ff",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Box sx={{ fontSize: "1.8em" }}>🚚</Box>
            <Box>
              <Box sx={{ fontWeight: 700, color: "#667eea", fontSize: "1.1em" }}>
                Convoy
              </Box>
              <Box sx={{ fontSize: "0.75em", color: "#999" }}>Management</Box>
            </Box>
          </Box>
          <IconButton 
            onClick={toggleDrawer} 
            sx={{ 
              color: "#667eea",
              zIndex: 1301
            }}
          >
            <CloseIcon />
          </IconButton>
        </Box>

        {/* Menu Items */}
        <List sx={{ width: 280, paddingTop: 2 }}>
          {menuItems.map((item) => (
            <ListItemButton
              key={item.path}
              component={Link}
              to={item.path}
              onClick={toggleDrawer}
              sx={{
                margin: "0.5rem 1rem",
                borderRadius: "8px",
                transition: "all 0.3s ease",
                "&:hover": {
                  background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                  color: "white",
                  transform: "translateX(4px)",
                },
                "&.active": {
                  background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                  color: "white",
                },
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 2,
                  width: "100%",
                  color: "inherit",
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", color: "inherit" }}>
                  {item.icon}
                </Box>
                <ListItemText
                  primary={item.label}
                  sx={{
                    "& .MuiListItemText-primary": {
                      fontWeight: 600,
                      fontSize: "0.95em",
                    },
                  }}
                />
              </Box>
            </ListItemButton>
          ))}
        </List>

        {/* Version Info at Bottom */}
        <Box
          sx={{
            position: "absolute",
            bottom: 20,
            left: 20,
            right: 20,
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            padding: "1rem",
            borderRadius: "8px",
            color: "white",
            textAlign: "center",
            fontSize: "0.85em",
          }}
        >
          <Box sx={{ fontWeight: 600, marginBottom: "0.5rem" }}>v1.0.0</Box>
          <Box sx={{ opacity: 0.8 }}>Convoy Management System</Box>
        </Box>
      </Drawer>

      {/* Overlay when sidebar is open */}
      {open && (
        <Box
          onClick={toggleDrawer}
          sx={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.4)",
            zIndex: 1200,
          }}
        />
      )}
    </>
  );
}