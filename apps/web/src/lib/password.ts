const PBKDF2_ITERATIONS = 120_000;
const HASH_LENGTH = 32;

function textEncoder() {
  return new TextEncoder();
}

function toBase64Url(bytes: Uint8Array) {
  return Buffer.from(bytes)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function fromBase64Url(value: string) {
  const padded = value
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(Math.ceil(value.length / 4) * 4, "=");

  return Uint8Array.from(Buffer.from(padded, "base64"));
}

async function deriveKey(password: string, salt: Uint8Array, iterations: number) {
  const passwordKey = await crypto.subtle.importKey(
    "raw",
    textEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );

  const derived = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations,
      hash: "SHA-256"
    },
    passwordKey,
    HASH_LENGTH * 8
  );

  return new Uint8Array(derived);
}

export async function hashPassword(password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await deriveKey(password, salt, PBKDF2_ITERATIONS);
  return `pbkdf2$${PBKDF2_ITERATIONS}$${toBase64Url(salt)}$${toBase64Url(hash)}`;
}

export async function verifyPassword(password: string, storedHash: string) {
  const [algorithm, iterationsText, saltValue, hashValue] = storedHash.split("$");

  if (algorithm !== "pbkdf2" || !iterationsText || !saltValue || !hashValue) {
    return false;
  }

  const iterations = Number(iterationsText);

  if (!Number.isFinite(iterations) || iterations <= 0) {
    return false;
  }

  const salt = fromBase64Url(saltValue);
  const expectedHash = fromBase64Url(hashValue);
  const actualHash = await deriveKey(password, salt, iterations);

  if (actualHash.length !== expectedHash.length) {
    return false;
  }

  let mismatch = 0;

  for (let index = 0; index < actualHash.length; index += 1) {
    mismatch |= actualHash[index] ^ expectedHash[index];
  }

  return mismatch === 0;
}
