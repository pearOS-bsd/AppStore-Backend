const fs = require("fs");
const path = require("path");
const { parseIssueBody, toLines, toBool, toChecked } = require("./lib/parseIssueBody");
const { numericIdFrom } = require("./lib/hash");
const { validateApp } = require("./validate");

const issueNumber = Number(process.env.ISSUE_NUMBER);
const issueUser = process.env.ISSUE_USER || "unknown";
const bodyFile = process.env.ISSUE_BODY_FILE;

if (!issueNumber || !bodyFile) {
  console.error("ISSUE_NUMBER and ISSUE_BODY_FILE env vars are required");
  process.exit(1);
}

const body = fs.readFileSync(bodyFile, "utf8");
const f = parseIssueBody(body);

function parseIapList(raw) {
  return toLines(raw).map((line) => {
    const [id, name, price, type] = line.split("|").map((s) => s.trim());
    return { id, name, price: Number(price), type };
  });
}

function parseDataTypes(raw) {
  return toLines(raw).map((line) => {
    const [purpose, rest] = line.split(":");
    return {
      purpose: (purpose || "").trim(),
      dataTypes: (rest || "").split(",").map((s) => s.trim()).filter(Boolean),
    };
  });
}

// GitHub renders an uploaded file as a markdown link: [filename.zip](https://...)
function parseUploadUrl(raw) {
  const match = String(raw || "").match(/\]\((https?:\/\/[^\s)]+)\)/);
  return match ? match[1] : "";
}

const bundleId = f["Bundle ID"];
const developerName = f["Developer / Company Name"];
const appId = numericIdFrom(`app:${bundleId}`);
const developerId = numericIdFrom(`dev:${developerName}:${f["Developer Website"]}`);

const architectures = [];
if (toChecked(f["Supported Architectures"], "arm64")) architectures.push("arm64");
if (toChecked(f["Supported Architectures"], "x86_64")) architectures.push("x86_64");

const secondary = f["Secondary Category (optional)"];
const buildUploadUrl = parseUploadUrl(f["Build File (.pkg or .app.zip)"]);

const app = {
  appId,
  bundleId,
  platform: "pearOS",
  status: "pending",
  submission: {
    issueNumber,
    submittedAt: new Date().toISOString(),
    submittedBy: issueUser,
    ...(buildUploadUrl ? { buildUploadUrl } : {}),
  },
  developer: {
    developerId,
    name: developerName,
    developerWebsite: f["Developer Website"],
    supportWebsite: f["Support Website"],
  },
  generalInfo: {
    defaultLanguage: f["Default Language"] || "en-US",
    category: {
      primary: f["Primary Category"],
      ...(secondary ? { secondary } : {}),
    },
    contentAdvisoryRating: f["Content Advisory Rating"],
  },
  pearOsRequirements: {
    minimumPearOsVersion: f["Minimum pearOS Version"],
    supportedArchitectures: architectures,
    isUniversalBinary: toBool(f["Universal Binary?"]),
    pearAppSandboxEnabled: toBool(f["pearOS App Sandbox Enabled?"]),
    hardenedRuntime: toBool(f["Hardened Runtime Enabled?"]),
    entitlements: toLines(f["Entitlements"]),
  },
  commercial: {
    isFree: toBool(f["Is the app free?"]),
    price: Number(f["Price (0.00 if free)"] || 0),
    currency: f["Currency"] || "USD",
    inAppPurchasesAvailable: toBool(f["In-App Purchases Available?"]),
    inAppPurchasesList: parseIapList(f["In-App Purchases List"]),
  },
  currentRelease: {
    version: f["Version"],
    buildNumber: f["Build Number"],
    releaseDate: new Date().toISOString(),
    downloadSizeFormatted: f["Download Size (formatted)"],
    downloadSizeBytes: Number(f["Download Size (bytes)"] || 0),
    binaryType: f["Binary Type"] || "pearOS Universal Binary",
    supportedDeviceModels: toLines(f["Supported pearOS Device Models"]),
  },
  localizedMetadata: {
    [f["Default Language"] || "en-US"]: {
      title: f["App Name"],
      subtitle: f["Subtitle"],
      description: f["Description"],
      whatsNew: f["What's New"],
    },
  },
  ratingsAndReviews: {
    averageUserRating: 0,
    userRatingCount: 0,
  },
  appPrivacy: {
    privacyPolicyUrl: f["Privacy Policy URL"],
    dataTypesCollected: parseDataTypes(f["Data Types Collected"]),
  },
  assets: {
    appIconUrl: f["App Icon URL (1024x1024)"],
    screenshots: {
      pearos: toLines(f["Screenshots (pearOS)"]),
    },
  },
};

const result = validateApp(app);
if (!result.valid) {
  console.error("Schema validation failed:");
  console.error(JSON.stringify(result.errors, null, 2));
  fs.writeFileSync("/tmp/validation-errors.json", JSON.stringify(result.errors, null, 2));
  process.exit(1);
}

const outDir = path.join(__dirname, "..", "data", "pending");
fs.mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, `${appId}.json`);
fs.writeFileSync(outFile, JSON.stringify(app, null, 2) + "\n");

console.log(`Wrote ${outFile}`);
console.log(`::set-output name=appId::${appId}`);
process.stdout.write(`APP_ID=${appId}\n`);
if (process.env.GITHUB_OUTPUT) {
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `appId=${appId}\nappName=${f["App Name"]}\noutFile=data/pending/${appId}.json\n`);
}
