import { createContext, useContext, useEffect, useState } from "react";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import { useGetMe, User } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { getStoredToken, setStoredToken, clearStoredToken } from "@/lib/storage";

export { getStoredToken, setStoredToken, clearStoredToken };

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (token: string, user?: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  login: () => {},
  logout: () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [token, setToken] = useState<string | null>(getStoredToken);

  useEffect(() => {
    setAuthTokenGetter(() => token || "");
  }, [token]);

  const { data: user, isLoading, error } = useGetMe({
    query: {
      enabled: !!token,
      retry: false,
    } as any,
  });

  useEffect(() => {
    if (error) {
      setToken(null);
      clearStoredToken();
    }
  }, [error]);

  const handleLogin = (newToken: string, _user?: User) => {
    setStoredToken(newToken);
    setToken(newToken);
  };

  const queryClient = useQueryClient();
  const handleLogout = () => {
    clearStoredToken();
    setToken(null);
    queryClient.clear();
    window.location.href = "/";
  };

  return (
    <AuthContext.Provider
      value={{
        user: user || null,
        isLoading: !!token && isLoading,
        login: handleLogin,
        logout: handleLogout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
