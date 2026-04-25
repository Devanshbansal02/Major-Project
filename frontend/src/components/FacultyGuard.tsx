import { Navigate } from "react-router-dom";
import { useAuthStore } from "../store/auth";

interface Props {
  children: React.ReactNode;
}

export default function FacultyGuard({ children }: Props) {
  const token = useAuthStore((s) => s.token);
  if (!token) return <Navigate to="/faculty/login" replace />;
  return <>{children}</>;
}
