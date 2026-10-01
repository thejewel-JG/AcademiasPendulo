/**
 * Hostinger Autonomous Standalone Cron Worker
 * Executed via Hostinger Cron Job: node cron/mail_sync_worker.js
 * Runs independently of developer machine or local agent processes.
 */
import { syncImapMailbox, processPendingEmailTasks } from '../mailEngine.js';

async function executeAutonomousWorker() {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] 🚀 Starting Hostinger Autonomous Cron Worker...`);

  try {
    // 1. Process pending email tasks queue (onboarding emails, notifications)
    console.log(`[${timestamp}] 📧 Processing pending email tasks...`);
    const taskResult = await processPendingEmailTasks();
    console.log(`[${timestamp}] ✅ Task Processing Result:`, JSON.stringify(taskResult));

    // 2. Synchronize corporate IMAP mailbox
    console.log(`[${timestamp}] 📥 Synchronizing IMAP inbox...`);
    const syncResult = await syncImapMailbox();
    console.log(`[${timestamp}] ✅ IMAP Sync Result:`, JSON.stringify(syncResult));

    console.log(`[${timestamp}] 🎉 Autonomous Cron Worker finished successfully.`);
    process.exit(0);
  } catch (error) {
    console.error(`[${timestamp}] ❌ Autonomous Cron Worker Failed:`, error.message);
    process.exit(1);
  }
}

executeAutonomousWorker();
