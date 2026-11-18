import express from "express";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const app = express();
app.use(express.json());

const allowedOrigins = new Set([
  "http://localhost:3000",
  "http://127.0.0.1:3000",
]);

app.use((req, res, next) => {
  const origin = req.get("Origin");

  if (origin && allowedOrigins.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  }

  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_ACCESS_SECRET_KEY = process.env.R2_ACCESS_SECRET_KEY;
const R2_ENDPOINT = process.env.R2_ENDPOINT;
const R2_BUCKET = process.env.R2_BUCKET;
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;

if (!R2_ACCESS_KEY_ID || !R2_ACCESS_SECRET_KEY || !R2_ENDPOINT || !R2_BUCKET) {
  throw new Error("Missing required R2 env vars");
}

const s3Client = new S3Client({
  region: "auto",
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_ACCESS_SECRET_KEY,
  },
  requestChecksumCalculation: "WHEN_REQUIRED",
  responseChecksumValidation: "WHEN_REQUIRED",
});

function getFileExtension(fileName: string) {
  const parts = fileName.split(".");
  const extension = parts[parts.length - 1];
  return extension && extension !== fileName ? extension : "bin";
}

app.post("/presign", async (req, res) => {
  const { fileName, fileType } = req.body ?? {};

  if (!fileName || !fileType)
    return res.status(400).json({ error: "fileName and fileType are required" });

  if (!fileType.startsWith("image/"))
    return res.status(400).json({ error: "Only image uploads allowed" });

  const extension = getFileExtension(fileName);
  const key = `uploads/${Date.now()}-${crypto.randomUUID()}.${extension}`;

  try {
    const command = new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      ContentType: fileType,
    });

    const signedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 60,
    });

    const publicUrl = R2_PUBLIC_URL
      ? `${R2_PUBLIC_URL.replace(/\/$/, "")}/${key}`
      : null;

    res.json({ signedUrl, key, publicUrl });
  } catch (error) {
    console.error("Failed to generate presigned URL:", error);
    res.status(500).json({ error: "Failed to generate URL" });
  }
});


app.listen(4000, () => {
  console.log("Server running on port 4000");
});