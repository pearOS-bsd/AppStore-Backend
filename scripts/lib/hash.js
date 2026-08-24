const crypto = require("crypto");

// Deterministic 9-digit numeric id derived from an arbitrary string.
function numericIdFrom(seed, digits = 9) {
  const hash = crypto.createHash("sha256").update(seed).digest("hex");
  const asInt = BigInt("0x" + hash.slice(0, 16));
  const mod = 10n ** BigInt(digits - 1);
  return Number((asInt % (9n * mod)) + mod);
}

module.exports = { numericIdFrom };
