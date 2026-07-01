#!/usr/bin/env node
import { createSign } from "node:crypto";
import { readFile } from "node:fs/promises";

const COLLECTION_ID = "compositions";
const FIRESTORE_SCOPE = "https://www.googleapis.com/auth/datastore";
const TOKEN_URL = "https://oauth2.googleapis.com/token";

const args = new Set(process.argv.slice(2));
const shouldWrite = args.has("--write");
const showHelp = args.has("--help") || args.has("-h");

if (showHelp) {
  console.log(`
Usage:
  npm run migrate:prakaar
  npm run migrate:prakaar -- --write

Credentials:
  Set GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
  or FIREBASE_SERVICE_ACCOUNT_JSON='{...service account json...}'

Behavior:
  Dry-run by default. With --write, updates Firestore documents in the
  compositions collection where sectionTitle is exactly "Prakar N" on a
  prakaar section, changing it to "Prakaar N".
`.trim());
  process.exit(0);
}

function base64Url(input) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

async function loadServiceAccount() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  }

  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    const raw = await readFile(process.env.GOOGLE_APPLICATION_CREDENTIALS, "utf8");
    return JSON.parse(raw);
  }

  throw new Error(
    "Missing service account. Set GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_SERVICE_ACCOUNT_JSON.",
  );
}

async function createAccessToken(serviceAccount) {
  const now = Math.floor(Date.now() / 1000);
  const privateKey = serviceAccount.private_key?.replace(/\\n/g, "\n");
  if (!serviceAccount.client_email || !privateKey) {
    throw new Error("Service account must include client_email and private_key.");
  }

  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claimSet = base64Url(
    JSON.stringify({
      iss: serviceAccount.client_email,
      scope: FIRESTORE_SCOPE,
      aud: TOKEN_URL,
      iat: now,
      exp: now + 3600,
    }),
  );
  const unsignedJwt = `${header}.${claimSet}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsignedJwt);
  const signature = signer
    .sign(privateKey, "base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${unsignedJwt}.${signature}`,
    }),
  });

  if (!response.ok) {
    throw new Error(`OAuth token request failed: ${response.status} ${await response.text()}`);
  }

  const data = await response.json();
  if (!data.access_token) throw new Error("OAuth token response did not include access_token.");
  return data.access_token;
}

async function firestoreRequest(accessToken, url, init = {}) {
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) {
    throw new Error(`Firestore request failed: ${response.status} ${await response.text()}`);
  }

  return response.status === 204 ? null : response.json();
}

function stringValue(fields, key) {
  return fields?.[key]?.stringValue ?? "";
}

function correctedPrakaarTitle(title) {
  const match = title.match(/^Prakar(\s+[0-9]+)$/);
  return match ? `Prakaar${match[1]}` : title;
}

function plannedLineUpdates(document) {
  const lineValues = document.fields?.lines?.arrayValue?.values ?? [];
  const updates = [];
  const nextLineValues = lineValues.map((lineValue, index) => {
    const lineFields = lineValue.mapValue?.fields;
    const section = stringValue(lineFields, "section");
    const sectionTitle = stringValue(lineFields, "sectionTitle");
    const nextTitle = section === "prakaar" ? correctedPrakaarTitle(sectionTitle) : sectionTitle;

    if (nextTitle === sectionTitle) return lineValue;

    updates.push({
      lineIndex: index,
      from: sectionTitle,
      to: nextTitle,
    });

    return {
      ...lineValue,
      mapValue: {
        ...lineValue.mapValue,
        fields: {
          ...lineFields,
          sectionTitle: { stringValue: nextTitle },
        },
      },
    };
  });

  return {
    updates,
    nextLinesField: {
      arrayValue: {
        values: nextLineValues,
      },
    },
  };
}

async function listCompositionDocuments(accessToken, projectId) {
  const documents = [];
  let pageToken = "";

  do {
    const url = new URL(
      `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${COLLECTION_ID}`,
    );
    url.searchParams.set("pageSize", "300");
    if (pageToken) url.searchParams.set("pageToken", pageToken);

    const data = await firestoreRequest(accessToken, url);
    documents.push(...(data.documents ?? []));
    pageToken = data.nextPageToken ?? "";
  } while (pageToken);

  return documents;
}

async function updateCompositionLines(accessToken, document, nextLinesField) {
  const url = new URL(`https://firestore.googleapis.com/v1/${document.name}`);
  url.searchParams.set("updateMask.fieldPaths", "lines");

  await firestoreRequest(accessToken, url, {
    method: "PATCH",
    body: JSON.stringify({
      fields: {
        lines: nextLinesField,
      },
    }),
  });
}

function documentId(documentName) {
  return documentName.split("/").pop();
}

const serviceAccount = await loadServiceAccount();
const projectId =
  process.env.FIREBASE_PROJECT_ID ||
  process.env.GCLOUD_PROJECT ||
  serviceAccount.project_id;

if (!projectId) {
  throw new Error("Missing project ID. Set FIREBASE_PROJECT_ID or use a service account with project_id.");
}

const accessToken = await createAccessToken(serviceAccount);
const documents = await listCompositionDocuments(accessToken, projectId);
const plans = documents
  .map((document) => ({
    document,
    ...plannedLineUpdates(document),
  }))
  .filter((plan) => plan.updates.length > 0);

console.log(
  `${shouldWrite ? "WRITE" : "DRY RUN"}: ${plans.length} of ${documents.length} composition documents need Prakaar title cleanup.`,
);

plans.forEach((plan) => {
  const fields = plan.document.fields ?? {};
  const title = stringValue(fields, "title") || stringValue(fields, "titleDevanagari") || documentId(plan.document.name);
  console.log(`- ${documentId(plan.document.name)}: ${title}`);
  plan.updates.forEach((update) => {
    console.log(`  line ${update.lineIndex + 1}: "${update.from}" -> "${update.to}"`);
  });
});

if (!shouldWrite) {
  console.log("Dry run only. Re-run with --write to update Firestore.");
  process.exit(0);
}

for (const plan of plans) {
  await updateCompositionLines(accessToken, plan.document, plan.nextLinesField);
  console.log(`Updated ${documentId(plan.document.name)}`);
}

console.log(`Done. Updated ${plans.length} composition documents.`);
