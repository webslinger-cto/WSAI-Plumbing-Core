import { Queue, QueueEvents } from "bullmq";
import IORedis from "ioredis";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

let connection: IORedis | null = null;
let permitsQueue: Queue | null = null;
let queueEvents: QueueEvents | null = null;

function getConnection(): IORedis {
  if (!connection) {
    connection = new IORedis(REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });
  }
  return connection;
}

export function getPermitsQueue(): Queue {
  if (!permitsQueue) {
    permitsQueue = new Queue("permits", {
      connection: getConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 5000,
        },
        removeOnComplete: 100,
        removeOnFail: 50,
      },
    });
  }
  return permitsQueue;
}

export function getQueueEvents(): QueueEvents {
  if (!queueEvents) {
    queueEvents = new QueueEvents("permits", {
      connection: getConnection(),
    });
  }
  return queueEvents;
}

export type PermitJobName =
  | "FORMS_CHECK_JOB"
  | "PACKET_GENERATE_JOB"
  | "EMAIL_SUBMIT_JOB";

export interface FormsCheckJobData {
  jurisdictionId: string;
  idempotencyKey: string;
}

export interface PacketGenerateJobData {
  packetId: string;
  templateId: string;
  templateVersion?: number;
  idempotencyKey: string;
}

export interface EmailSubmitJobData {
  packetId: string;
  destinationEmail: string;
  attachmentHashes: string[];
  idempotencyKey: string;
}

export type PermitJobData = FormsCheckJobData | PacketGenerateJobData | EmailSubmitJobData;

export async function addFormsCheckJob(data: FormsCheckJobData): Promise<void> {
  const queue = getPermitsQueue();
  await queue.add("FORMS_CHECK_JOB", data, {
    jobId: data.idempotencyKey,
  });
}

export async function addPacketGenerateJob(data: PacketGenerateJobData): Promise<void> {
  const queue = getPermitsQueue();
  await queue.add("PACKET_GENERATE_JOB", data, {
    jobId: data.idempotencyKey,
  });
}

export async function addEmailSubmitJob(data: EmailSubmitJobData): Promise<void> {
  const queue = getPermitsQueue();
  await queue.add("EMAIL_SUBMIT_JOB", data, {
    jobId: data.idempotencyKey,
  });
}

export function isRedisConfigured(): boolean {
  return !!process.env.REDIS_URL;
}

export async function closeQueue(): Promise<void> {
  if (permitsQueue) {
    await permitsQueue.close();
    permitsQueue = null;
  }
  if (queueEvents) {
    await queueEvents.close();
    queueEvents = null;
  }
  if (connection) {
    connection.disconnect();
    connection = null;
  }
}
