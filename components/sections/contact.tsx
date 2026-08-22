"use client";

import * as React from "react";
import { Mail } from "lucide-react";
import { toast } from "sonner";

import { Field } from "@/components/auth/field";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/auth/submit-button";
import { Reveal } from "@/components/motion/reveal";
import { submitContactMessage } from "@/app/contact-actions";
import { salesEmail } from "@/lib/data";
import { cn } from "@/lib/utils";

export function Contact() {
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [business, setBusiness] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const result = await submitContactMessage({ name, email, business, message });

    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      toast.error(result.error);
      return;
    }

    toast.success("Message sent — we'll be in touch shortly.");
    setName("");
    setEmail("");
    setBusiness("");
    setMessage("");
  }

  return (
    <section id="contact" className="scroll-mt-20 bg-section-alt py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
          <Reveal>
            <p className="text-sm font-semibold tracking-wider text-muted-foreground uppercase">
              Contact
            </p>
            <h2 className="text-display mt-4 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Let&rsquo;s talk about your space
            </h2>
            <p className="mt-5 max-w-md text-lg leading-relaxed text-muted-foreground">
              Tell us a bit about your business and what you&rsquo;re looking
              for — we&rsquo;ll get back to you within a day or two.
            </p>
            <a
              href={salesEmail}
              className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-foreground transition-colors hover:text-brand-strong"
            >
              <Mail className="size-4" aria-hidden="true" />
              business@tazama.fm
            </a>
          </Reveal>

          <Reveal delay={0.1}>
            <form
              onSubmit={onSubmit}
              noValidate
              className="rounded-3xl border border-border bg-card p-6 shadow-soft sm:p-8 dark:shadow-none"
            >
              <div className="grid gap-5 sm:grid-cols-2">
                <Field
                  id="contact-name"
                  label="Full name"
                  autoComplete="name"
                  placeholder="Jane Doe"
                  value={name}
                  onValueChange={setName}
                  disabled={loading}
                  required
                />
                <Field
                  id="contact-email"
                  label="Email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="you@business.com"
                  value={email}
                  onValueChange={setEmail}
                  disabled={loading}
                  required
                />
              </div>

              <div className="mt-5">
                <Field
                  id="contact-business"
                  label="Business name"
                  optional
                  autoComplete="organization"
                  placeholder="Your business"
                  value={business}
                  onValueChange={setBusiness}
                  disabled={loading}
                />
              </div>

              <div className="mt-5 space-y-1.5">
                <Label htmlFor="contact-message">What can we help with?</Label>
                <Textarea
                  id="contact-message"
                  placeholder="Tell us about your space and what you're looking for…"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  disabled={loading}
                  required
                  rows={5}
                  aria-invalid={error ? true : undefined}
                />
              </div>

              {error ? (
                <p role="alert" className="mt-3 text-xs text-destructive">
                  {error}
                </p>
              ) : null}

              <SubmitButton loading={loading} className={cn("mt-6")}>
                Send message
              </SubmitButton>
            </form>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
