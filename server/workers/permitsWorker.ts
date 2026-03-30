import { Worker, Job } from "bullmq";
import IORedis from "ioredis";
import { db } from "../db";
import { permitPackets } from "@shared/schema";
import { eq } from "drizzle-orm";
import type {
  FormsCheckJobData,
  PacketGenerateJobData,
  EmailSubmitJobData,
} from "../queue/permitsQueue";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

let worker: Worker | null = null;
let connection: IORedis | null = null;

async function processFormsCheckJob(job: Job<FormsCheckJobData>): Promise<void> {
  const { jurisdictionId, idempotencyKey } = job.data;
  console.log(`[PermitsWorker] Processing FORMS_CHECK_JOB for jurisdiction ${jurisdictionId}, key=${idempotencyKey}`);
  
  try {
    const { checkJurisdictionForms } = await import("../modules/permits/formsCheck");
    await checkJurisdictionForms(jurisdictionId);
    console.log(`[PermitsWorker] FORMS_CHECK_JOB completed for jurisdiction ${jurisdictionId}`);
  } catch (error) {
    console.error(`[PermitsWorker] FORMS_CHECK_JOB failed for jurisdiction ${jurisdictionId}:`, error);
    throw error;
  }
}

async function processPacketGenerateJob(job: Job<PacketGenerateJobData>): Promise<void> {
  const { packetId, templateId, idempotencyKey } = job.data;
  console.log(`[PermitsWorker] Processing PACKET_GENERATE_JOB for packet ${packetId}, key=${idempotencyKey}`);
  
  try {
    const { generatePacketFromTemplate } = await import("../modules/permits/pdfFill");
    await generatePacketFromTemplate(packetId, templateId);
    console.log(`[PermitsWorker] PACKET_GENERATE_JOB completed for packet ${packetId}`);
  } catch (error) {
    console.error(`[PermitsWorker] PACKET_GENERATE_JOB failed for packet ${packetId}:`, error);
    await db.update(permitPackets)
      .set({ 
        status: "error", 
        errorMessage: String(error),
        updatedAt: new Date(),
      })
      .where(eq(permitPackets.id, packetId));
    throw error;
  }
}

async function processEmailSubmitJob(job: Job<EmailSubmitJobData>): Promise<void> {
  const { packetId, destinationEmail, idempotencyKey } = job.data;
  console.log(`[PermitsWorker] Processing EMAIL_SUBMIT_JOB for packet ${packetId} to ${destinationEmail}, key=${idempotencyKey}`);
  
  try {
    const { submitPacketViaEmail } = await import("../modules/permits/emailSubmit");
    await submitPacketViaEmail(packetId, destinationEmail);
    console.log(`[PermitsWorker] EMAIL_SUBMIT_JOB completed for packet ${packetId}`);
  } catch (error) {
    console.error(`[PermitsWorker] EMAIL_SUBMIT_JOB failed for packet ${packetId}:`, error);
    await db.update(permitPackets)
      .set({ 
        status: "error", 
        errorMessage: String(error),
        updatedAt: new Date(),
      })
      .where(eq(permitPackets.id, packetId));
    throw error;
  }
}

export function startPermitsWorker(): Worker {
  if (worker) {
    return worker;
  }
  
  if (!process.env.REDIS_URL) {
    console.log("[PermitsWorker] Redis not configured, worker will not start");
    return null as any;
  }
  
  connection = new IORedis(REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });
  
  worker = new Worker(
    "permits",
    async (job: Job) => {
      switch (job.name) {
        case "FORMS_CHECK_JOB":
          await processFormsCheckJob(job as Job<FormsCheckJobData>);
          break;
        case "PACKET_GENERATE_JOB":
          await processPacketGenerateJob(job as Job<PacketGenerateJobData>);
          break;
        case "EMAIL_SUBMIT_JOB":
          await processEmailSubmitJob(job as Job<EmailSubmitJobData>);
          break;
        default:
          console.warn(`[PermitsWorker] Unknown job type: ${job.name}`);
      }
    },
    {
      connection,
      concurrency: 2,
    }
  );
  
  worker.on("completed", (job) => {
    console.log(`[PermitsWorker] Job ${job.id} (${job.name}) completed`);
  });
  
  worker.on("failed", (job, error) => {
    console.error(`[PermitsWorker] Job ${job?.id} (${job?.name}) failed:`, error.message);
  });
  
  console.log("[PermitsWorker] Worker started and listening for jobs");
  
  return worker;
}

export async function stopPermitsWorker(): Promise<void> {
  if (worker) {
    await worker.close();
    worker = null;
  }
  if (connection) {
    connection.disconnect();
    connection = null;
  }
}
