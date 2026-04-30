import { setTimeout as sleep } from "node:timers/promises";

import { createDb } from "../../db/client.js";
import { env } from "../../lib/config.js";
import { log } from "../../lib/logger.js";
import { GemmaClient } from "../ai/gemma-client.js";
import { ClassificationService } from "../classification/classification.service.js";
import { JobService } from "./job.service.js";

const WORKER_POLL_INTERVAL_MS = 2_000;
const WORKER_CLAIM_LIMIT = 5;
const WORKER_ID = `worker-${process.pid}`;

const db = createDb(env.DATABASE_URL);
const classificationService = new ClassificationService(db, new GemmaClient());
const jobService = new JobService(db, classificationService);
const workerLog = log.child({
  workerId: WORKER_ID,
  component: "job-worker",
});

workerLog.info("job_worker_started", {
  pollIntervalMs: WORKER_POLL_INTERVAL_MS,
  claimLimit: WORKER_CLAIM_LIMIT,
});

while (true) {
  try {
    const claimedJobs = await jobService.claimJobs(WORKER_CLAIM_LIMIT, WORKER_ID);
    if (claimedJobs.length === 0) {
      await sleep(WORKER_POLL_INTERVAL_MS);
      continue;
    }

    for (const claimedJob of claimedJobs) {
      await jobService.processClaimedJob(claimedJob, workerLog);
    }
  } catch (error) {
    workerLog.error("job_worker_loop_failed", { err: error });
    await sleep(WORKER_POLL_INTERVAL_MS);
  }
}
