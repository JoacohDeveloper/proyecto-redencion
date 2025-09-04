"use client";
import { useAuth } from "@/Providers/AuthContext";
import Account from "./account";
import { ThemeSwitch } from "./theme-switch";

export default function Navbar() {
  const { user } = useAuth();

  return (
    <nav className="w-[100%] flex items-center justify-center ">
      <div className="w-[95%] py-3 px-4 border-1 border-black rounded-2xl flex mt-5 justify-between">
        <ThemeSwitch />
        <div>
          {user ? (
            <div>Welcome {user.username ?? user.email}</div>
          ) : (
            <Account />
          )}
        </div>
      </div>
    </nav>
  );
}
