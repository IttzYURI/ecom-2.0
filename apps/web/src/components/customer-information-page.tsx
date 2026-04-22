"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { readCustomerInfo, readCustomerSession, writeCustomerInfo } from "./customer-session";

export function CustomerInformationPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: ""
  });
  const [error, setError] = useState("");

  useEffect(() => {
    const session = readCustomerSession();

    if (session) {
      router.replace("/checkout");
      return;
    }

    const info = readCustomerInfo();
    if (info) {
      setForm(info);
    }
  }, [router]);

  return (
    <div className="content-grid customer-info-grid">
      <section className="panel tone-dark">
        <p className="eyebrow">Customer information</p>
        <h2>Tell us who this order is for</h2>
        <p>
          We need your contact details before checkout so the restaurant can confirm
          collection or delivery updates.
        </p>
      </section>
      <section className="panel">
        <form
          className="form-grid"
          onSubmit={(event) => {
            event.preventDefault();

            if (!form.name || !form.phone || !form.email) {
              setError("Please complete your name, phone number, and email.");
              return;
            }

            writeCustomerInfo(form);
            router.push("/checkout");
          }}
        >
          <input
            value={form.name}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            placeholder="Full name"
          />
          <input
            value={form.phone}
            onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
            placeholder="Phone number"
          />
          <input
            value={form.email}
            onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
            placeholder="Email address"
          />
          {error ? <p className="form-error">{error}</p> : null}
          <button type="submit" className="button-primary">
            Continue to payment
          </button>
        </form>
      </section>
    </div>
  );
}
