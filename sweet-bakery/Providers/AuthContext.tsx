"use client";
import React, { createContext, useContext, useState, useEffect } from "react";
const API_URL = process.env.NEXT_PUBLIC_API_URL;
interface User {
  id: string;
  username: string | undefined;
  email: string;
  role: string;
}

interface Tokens {
  accessToken: string;
  refreshToken: string;
}

interface AuthContextType {
  user: User | null;
  tokens: Tokens | null;
  login: (tokens: Tokens, user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [tokens, setToken] = useState<Tokens | null>(null);

  // Restaurar sesión desde localStorage
  useEffect(() => {
    const savedTokens = localStorage.getItem("token");
    const savedUser = localStorage.getItem("user");

    if (savedTokens && savedUser) {
      setToken(JSON.parse(savedTokens));
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const login = (newTokens: Tokens, newUser: User) => {
    localStorage.setItem("token", JSON.stringify(newTokens));
    localStorage.setItem("user", JSON.stringify(newUser));
    setToken(newTokens);
    setUser(newUser);
  };

  const logout = async () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken(null);
    setUser(null);

    const response = await fetch(`${API_URL}/api/common/logout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Tenant-Id": process.env.NEXT_PUBLIC_TENANT_ID as string,
      },
    });

    const data = await response.json();
    console.log(data);
  };

  return (
    <AuthContext.Provider value={{ user, tokens, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de un AuthProvider");
  return ctx;
};
