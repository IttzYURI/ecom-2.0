"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { writeCustomerInfo, writeCustomerSession } from "./customer-session";

export function CustomerAuthForm({
  mode
}: {
  mode: "login" | "signup";
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  return (
    <form
      className="form-grid"
      onSubmit={(event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const formData = new FormData(form);
        const name = String(formData.get("name") ?? "").trim();
        const email = String(formData.get("email") ?? "").trim();
        const password = String(formData.get("password") ?? "").trim();
        const confirmPassword = String(formData.get("confirmPassword") ?? "").trim();

        if (!email || !password || (mode === "signup" && !name)) {
          setError("Please complete the required fields.");
          return;
        }

        if (mode === "signup" && password !== confirmPassword) {
          setError("Passwords do not match.");
          return;
        }

        setError("");

        startTransition(async () => {
          const endpoint = mode === "login" ? "/api/v1/customer/auth/login" : "/api/v1/customer/auth/signup";
          const payload = mode === "login" ? { email, password } : { name, email, password };
          const response = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
          });
          const result = await response.json();

          if (!response.ok || !result.success) {
            setError(
              result.error?.message ??
                (mode === "login" ? "Unable to log in right now." : "Unable to create an account right now.")
            );
            return;
          }

          writeCustomerSession({
            email: result.data.user.email,
            name: result.data.user.name
          });

          if (mode === "signup") {
            writeCustomerInfo({ name, email, phone: "" });
          }

          router.replace("/account");
          router.refresh();
        });
      }}
    >
      {mode === "signup" ? <input name="name" placeholder="Full name" /> : null}
      <input name="email" placeholder="Email address" />
      <input name="password" type="password" placeholder="Password" />
      {mode === "signup" ? <input name="confirmPassword" type="password" placeholder="Confirm password" /> : null}
      {error ? <p className="form-error">{error}</p> : null}
      <button type="submit" className="button-primary" disabled={isPending}>
        {isPending ? (mode === "login" ? "Logging in..." : "Creating account...") : mode === "login" ? "Log in" : "Create account"}
      </button>
      <p className="auth-switch">
        {mode === "login" ? "Need an account?" : "Already registered?"}{" "}
        <Link href={mode === "login" ? "/signup" : "/login"} className="text-link">
          {mode === "login" ? "Sign up" : "Log in"}
        </Link>
      </p>
    </form>
  );
}
