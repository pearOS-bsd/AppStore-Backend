// GitHub renders an Issue Form body as a sequence of "### Label" headers
// followed by the field's value (or "_No response_" when left empty).
function parseIssueBody(body) {
  const fields = {};
  const parts = body.split(/^### /m).slice(1);
  for (const part of parts) {
    const newlineIndex = part.indexOf("\n");
    const label = part.slice(0, newlineIndex).trim();
    const value = part.slice(newlineIndex + 1).trim();
    fields[label] = value === "_No response_" ? "" : value;
  }
  return fields;
}

function toLines(value) {
  if (!value) return [];
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function toBool(yesNo) {
  return String(yesNo).trim().toLowerCase() === "yes";
}

function toChecked(value, optionLabel) {
  const line = toLines(value).find((l) => l.includes(optionLabel));
  return !!line && /^- \[[xX]\]/.test(line);
}

module.exports = { parseIssueBody, toLines, toBool, toChecked };
