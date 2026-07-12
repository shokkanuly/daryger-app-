import { S3Client, PutObjectCommand, GetObjectCommand, CreateBucketCommand, HeadBucketCommand } from "@aws-sdk/client-s3";
import { getSignedUrl as getS3SignedUrl } from "@aws-sdk/s3-request-presigner";

const endpoint = process.env.S3_ENDPOINT || "http://localhost:9000";
const bucketName = process.env.S3_BUCKET || "daryger-documents";
const accessKeyId = process.env.S3_ACCESS_KEY || "minioadmin";
const secretAccessKey = process.env.S3_SECRET_KEY || "minioadmin";

export const s3 = new S3Client({
  endpoint,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
  forcePathStyle: true, // Necessary for local MinIO
  region: "us-east-1",
});

// Helper to ensure bucket exists
export async function ensureBucketExists() {
  try {
    await s3.send(new HeadBucketCommand({ Bucket: bucketName }));
  } catch (error: any) {
    if (error.name === "NotFound" || error.$metadata?.httpStatusCode === 444 || error.$metadata?.httpStatusCode === 404) {
      try {
        await s3.send(new CreateBucketCommand({ Bucket: bucketName }));
        console.log(`Bucket "${bucketName}" created successfully.`);
      } catch (createErr) {
        console.error(`Failed to create bucket "${bucketName}":`, createErr);
      }
    } else {
      console.error(`Error checking bucket "${bucketName}":`, error);
    }
  }
}

export async function putObject(key: string, body: Buffer | string, contentType: string) {
  await ensureBucketExists();
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: body,
    ContentType: contentType,
  });
  return s3.send(command);
}

export async function getObject(key: string) {
  await ensureBucketExists();
  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: key,
  });
  const response = await s3.send(command);
  if (!response.Body) return null;
  return response.Body.transformToByteArray();
}

export async function getSignedUrl(key: string, expiresInSeconds = 3600) {
  await ensureBucketExists();
  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: key,
  });
  return getS3SignedUrl(s3, command, { expiresIn: expiresInSeconds });
}
