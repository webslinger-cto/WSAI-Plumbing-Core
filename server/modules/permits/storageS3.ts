import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import crypto from "crypto";

const S3_ENDPOINT = process.env.S3_ENDPOINT;
const S3_REGION = process.env.S3_REGION || "us-east-1";
const S3_BUCKET = process.env.S3_BUCKET || "permits";
const S3_ACCESS_KEY = process.env.S3_ACCESS_KEY;
const S3_SECRET_KEY = process.env.S3_SECRET_KEY;
const S3_FORCE_PATH_STYLE = process.env.S3_FORCE_PATH_STYLE === "true";

function getS3Client(): S3Client | null {
  if (!S3_ACCESS_KEY || !S3_SECRET_KEY) {
    return null;
  }
  
  const config: any = {
    region: S3_REGION,
    credentials: {
      accessKeyId: S3_ACCESS_KEY,
      secretAccessKey: S3_SECRET_KEY,
    },
    forcePathStyle: S3_FORCE_PATH_STYLE,
  };
  
  if (S3_ENDPOINT) {
    config.endpoint = S3_ENDPOINT;
  }
  
  return new S3Client(config);
}

function computeSha256(buffer: Buffer): string {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function generateFileKey(prefix: string, extension: string = "pdf"): string {
  const timestamp = Date.now();
  const randomId = crypto.randomBytes(8).toString("hex");
  return `${prefix}/${timestamp}-${randomId}.${extension}`;
}

export interface S3UploadResult {
  fileKey: string;
  sha256: string;
  size: number;
}

export async function putPdf(buffer: Buffer, keyPrefix: string = "packets"): Promise<S3UploadResult> {
  const client = getS3Client();
  if (!client) {
    throw new Error("S3 storage is not configured. Set S3_ACCESS_KEY and S3_SECRET_KEY environment variables.");
  }
  
  const fileKey = generateFileKey(keyPrefix, "pdf");
  const sha256 = computeSha256(buffer);
  const size = buffer.length;
  
  const command = new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: fileKey,
    Body: buffer,
    ContentType: "application/pdf",
  });
  
  await client.send(command);
  
  return { fileKey, sha256, size };
}

export async function putAttachment(
  buffer: Buffer,
  keyPrefix: string,
  contentType: string,
  extension: string = "bin"
): Promise<S3UploadResult> {
  const client = getS3Client();
  if (!client) {
    throw new Error("S3 storage is not configured. Set S3_ACCESS_KEY and S3_SECRET_KEY environment variables.");
  }
  
  const fileKey = generateFileKey(keyPrefix, extension);
  const sha256 = computeSha256(buffer);
  const size = buffer.length;
  
  const command = new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: fileKey,
    Body: buffer,
    ContentType: contentType,
  });
  
  await client.send(command);
  
  return { fileKey, sha256, size };
}

export async function getSignedDownloadUrl(fileKey: string, ttlSeconds: number = 3600): Promise<string> {
  const client = getS3Client();
  if (!client) {
    throw new Error("S3 storage is not configured. Set S3_ACCESS_KEY and S3_SECRET_KEY environment variables.");
  }
  
  const command = new GetObjectCommand({
    Bucket: S3_BUCKET,
    Key: fileKey,
  });
  
  return getSignedUrl(client, command, { expiresIn: ttlSeconds });
}

export async function deleteObject(fileKey: string): Promise<void> {
  const client = getS3Client();
  if (!client) {
    throw new Error("S3 storage is not configured. Set S3_ACCESS_KEY and S3_SECRET_KEY environment variables.");
  }
  
  const command = new DeleteObjectCommand({
    Bucket: S3_BUCKET,
    Key: fileKey,
  });
  
  await client.send(command);
}

export function isS3Configured(): boolean {
  return !!(S3_ACCESS_KEY && S3_SECRET_KEY);
}

export function computeHash(buffer: Buffer): string {
  return computeSha256(buffer);
}
