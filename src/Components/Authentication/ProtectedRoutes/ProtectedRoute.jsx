import { Navigate } from "react-router-dom";
import { useAuth } from "../AuthProvider/AuthProvider";

const ProtectedRoute = ({ children, requiredRole }) => {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ 
        width: "100vw",
        height: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "white"
      }}>
        <div>Loading...</div>
      </div>
    );
  }

  if (!user || !profile || profile.status !== "active") {
    return <Navigate to="/" replace />;
  }

  if (requiredRole && profile.role !== requiredRole) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;
