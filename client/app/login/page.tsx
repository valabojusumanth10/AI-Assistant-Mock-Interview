"use client";

import {
  FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";

import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

import {
  useAuth,
  type AuthUser,
} from "@/hooks/useAuth";

export default function LoginPage() {
  const router = useRouter();

  const {
    login,
    loading,
    isLoggedIn,
    user,
  } = useAuth();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [error, setError] = useState("");

  const hasRedirected = useRef(false);

  const routeUser = (currentUser: AuthUser) => {
    if (!currentUser) {
      return;
    }

    
    if (hasRedirected.current) {
      return;
    }

    hasRedirected.current = true;

    // ADMIN
    if (currentUser.role === "admin") {
      router.replace("/admin");
      return;
    }

  
    if (currentUser.role === "mentor") {
      router.replace("/mentor");
      return;
    }

    if (currentUser.roleSelectionCompleted !== true) {
      router.replace("/select-role");
      return;
    }

   
    router.replace("/dashboard");
  };


  useEffect(() => {
    if (loading) {
      return;
    }

    if (!isLoggedIn || !user) {
      return;
    }

    routeUser(user);
  }, [
    loading,
    isLoggedIn,
    user,
  ]);

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const {
      name,
      value,
    } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));

    if (error) {
      setError("");
    }
  };


  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    setError("");

    hasRedirected.current = false;

    const email =
      formData.email
        .trim()
        .toLowerCase();

    const password =
      formData.password;

 
    if (!email) {
      setError(
        "Please enter your email address.",
      );
      return;
    }

    if (!password) {
      setError(
        "Please enter your password.",
      );
      return;
    }

    try {
   
      const result = await login(
        email,
        password,
      );

   
      const loggedInUser =
        result?.user;

      if (!loggedInUser) {
        throw new Error(
          "Login succeeded but user information was not returned.",
        );
      }


      routeUser(loggedInUser);
    } catch (err: any) {
      console.error(
        "Login error:",
        err,
      );

 
      hasRedirected.current = false;

      const responseMessage =
        err?.response?.data?.message;

      const errorMessage =
        err instanceof Error
          ? err.message
          : "";

      setError(
        responseMessage ||
          errorMessage ||
          "Invalid email or password. Please try again.",
      );
    }
  };



  return (
    <main className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto flex min-h-[80vh] max-w-md items-center justify-center">

        <div className="w-full">

  

          <div className="mb-8 text-center">

            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-r from-primary to-accent text-lg font-black text-white shadow-lg">
              AI
            </div>

            <h1 className="mt-6 text-3xl font-bold text-foreground">
              Welcome back
            </h1>

            <p className="mt-2 text-sm text-muted-foreground">
              Sign in to continue your Placement AI journey.
            </p>

          </div>

      

          <Card className="border border-border/50 p-6 shadow-lg sm:p-8">

            <form
              onSubmit={handleSubmit}
              className="space-y-5"
            >


              {error && (
                <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-600 dark:text-red-400">
                  {error}
                </div>
              )}

            

              <div>

                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-semibold text-foreground"
                >
                  Email Address
                </label>

                <Input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                  disabled={loading}
                  className="rounded-lg"
                />

              </div>

           

              <div>

                <div className="mb-2 flex items-center justify-between">

                  <label
                    htmlFor="password"
                    className="block text-sm font-semibold text-foreground"
                  >
                    Password
                  </label>

                  <button
                    type="button"
                    onClick={() =>
                      router.push(
                        "/forgot-password",
                      )
                    }
                    disabled={loading}
                    className="text-xs font-semibold text-primary transition hover:opacity-80 disabled:opacity-50"
                  >
                    Forgot password?
                  </button>

                </div>

                <Input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  disabled={loading}
                  className="rounded-lg"
                />

              </div>


              <Button
                type="submit"
                disabled={loading}
                className="w-full rounded-full bg-gradient-to-r from-primary to-accent font-semibold text-white hover:opacity-90"
              >
                {loading
                  ? "Signing In..."
                  : "Sign In"}
              </Button>

            </form>

            

            <div className="mt-6 text-center text-sm">

              <span className="text-muted-foreground">
                Don't have an account?{" "}
              </span>

              <button
                type="button"
                onClick={() =>
                  router.push("/register")
                }
                className="font-semibold text-primary hover:underline"
              >
                Create Account
              </button>

            </div>

          </Card>

      

          <div className="mt-6 text-center">

            <p className="text-xs leading-5 text-muted-foreground">
              🔒 Your account is protected with secure
              authentication and session management.
            </p>

          </div>

        </div>
      </div>
    </main>
  );
}