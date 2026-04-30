import type { Db } from "./db/client.js";
import type { Logger } from "./lib/logger.js";
import type { ClassificationService } from "./modules/classification/classification.service.js";
import type { FeedbackService } from "./modules/feedback/feedback.service.js";
import type { JobService } from "./modules/jobs/job.service.js";

export type AuthContext = {
  clientId: string;
};

export type AppVariables = {
  db: Db;
  requestId: string;
  log: Logger;
  auth: AuthContext;
  classificationService: ClassificationService;
  feedbackService: FeedbackService;
  jobService: JobService;
};
