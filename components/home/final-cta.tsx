"use client";

import { useState } from "react";
import { ArrowRight, Check, LoaderCircle, Mail } from "lucide-react";
import { toast } from "sonner";

import { submitContactMessage } from "@/app/contact-actions";
import { cn } from "@/lib/utils";
import { Container, Kicker } from "./kit/primitives";
import { ctaLargeClass, ghostLargeDarkClass } from "./kit/styles";

const inputClass =
  "block h-11 w-full rounded-[10px] bg-white/[0.04] px-3.5 text-[15px] text-white ring-1 ring-white/[0.1] outline-none transition-shadow placeholder:text-white/30 focus-visible:ring-2 focus-visible:ring-brand/70 disabled:opacity-50 aria-invalid:ring-brand/70";

export function FinalCta() {
  const [form, setForm] = useState({ name: "", email: "", business: "", message: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const result = await submitContactMessage(form);
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      toast.error(result.error);
      return;
    }
    toast.success("Message sent — we’ll be in touch shortly.");
    setForm({ name: "", email: "", business: "", message: "" });
  }

  return (
    <section id="contact" aria-labelledby="cta-heading" className="relative scroll-mt-16 overflow-hidden bg-ink py-24 text-white sm:py-32 lg:py-40">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-white/15 to-transparent"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[900px] -translate-x-1/2 bg-[radial-gradient(ellipse_at_center,rgb(229_52_46/0.12),transparent_65%)]"
      />
      <Container wide className="relative">
        <div className="grid gap-14 lg:grid-cols-[1.15fr_1fr] lg:gap-20">
          <div>
            <Kicker index="12">Get started</Kicker>
            <h2
              id="cta-heading"
              className="mt-5 font-display text-[40px] leading-[1] font-semibold tracking-[-0.045em] text-balance sm:text-[60px] lg:text-[72px]"
            >
              Start with one screen. <span className="text-white/40">Grow to every location.</span>
            </h2>
            <p className="mt-6 max-w-lg text-[17px] leading-[1.6] text-zinc-400 sm:text-lg">
              Connect a TV with a 4-digit code, then add locations, zones, playlists and schedules as you grow.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <a href="/signup" className={ctaLargeClass}>
                Get started
                <ArrowRight aria-hidden className="size-4 transition-transform group-hover:translate-x-0.5" />
              </a>
              <a href="mailto:business@tazama.fm" className={ghostLargeDarkClass}>
                <Mail aria-hidden className="size-4" />
                business@tazama.fm
              </a>
            </div>
            <ul className="mt-10 space-y-2.5 text-[14px] text-white/60">
              {[
                "Works with the TVs and speakers you already have",
                "Guests join from their phone — no app to install",
                "Run one venue or every branch from the same dashboard",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2.5">
                  <Check aria-hidden className="size-4 text-white/40" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <form
            onSubmit={onSubmit}
            noValidate
            className="self-start rounded-[24px] bg-ink-2 p-6 ring-1 ring-white/[0.09] sm:p-8"
          >
            <p className="text-[18px] font-medium tracking-[-0.015em]">Talk to our team</p>
            <p className="mt-1 text-[14px] text-white/50">Tell us about your venues — we’ll reply within a day or two.</p>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <Field id="cta-name" label="Full name">
                <input id="cta-name" className={inputClass} autoComplete="name" placeholder="Jane Wanjiru" value={form.name} onChange={set("name")} disabled={loading} required />
              </Field>
              <Field id="cta-email" label="Work email">
                <input id="cta-email" type="email" inputMode="email" className={inputClass} autoComplete="email" placeholder="you@business.com" value={form.email} onChange={set("email")} disabled={loading} required />
              </Field>
            </div>
            <Field id="cta-business" label="Business" optional className="mt-4">
              <input id="cta-business" className={inputClass} autoComplete="organization" placeholder="Your business" value={form.business} onChange={set("business")} disabled={loading} />
            </Field>
            <Field id="cta-message" label="What can we help with?" className="mt-4">
              <textarea
                id="cta-message"
                rows={4}
                className={cn(inputClass, "h-auto resize-none py-3 leading-relaxed")}
                placeholder="How many locations and screens, and what you’d like to run on them…"
                value={form.message}
                onChange={set("message")}
                disabled={loading}
                required
                aria-invalid={error ? true : undefined}
              />
            </Field>

            {error ? (
              <p role="alert" className="mt-3 text-[13px] text-brand">
                {error}
              </p>
            ) : null}

            <button type="submit" disabled={loading} className={cn(ctaLargeClass, "mt-6 w-full disabled:opacity-60")}>
              {loading ? <LoaderCircle aria-hidden className="size-4 animate-spin" /> : null}
              Send message
            </button>
          </form>
        </div>
      </Container>
    </section>
  );
}

function Field({
  id,
  label,
  optional,
  className,
  children,
}: {
  id: string;
  label: string;
  optional?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 flex items-center justify-between text-[13px] text-white/70">
        {label}
        {optional ? <span className="text-[12px] text-white/35">Optional</span> : null}
      </label>
      {children}
    </div>
  );
}
