import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I ambiguity
const CODE_LENGTH = 6;
const EXPIRY_MS = 15 * 60 * 1000;

function generateCode(): string {
  let out = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    out += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return out;
}

export async function POST() {
  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json(
      { error: "Pairing isn't configured yet." },
      { status: 503 },
    );
  }

  const deviceToken = randomUUID();
  let code = generateCode();
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data: existing } = await admin
      .from("device_pairings")
      .select("id")
      .eq("code", code)
      .maybeSingle();
    if (!existing) break;
    code = generateCode();
  }

  const expiresAt = new Date(Date.now() + EXPIRY_MS).toISOString();
  const { error } = await admin.from("device_pairings").insert({
    code,
    device_token: deviceToken,
    expires_at: expiresAt,
  });
  if (error) {
    return NextResponse.json(
      { error: "Could not start pairing." },
      { status: 500 },
    );
  }

  return NextResponse.json({ code, deviceToken, expiresAt });
}
