import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { JWT } from "npm:google-auth-library@9";

type PushDevice = {
  platform: "android" | "ios";
  device_id: string;
  push_token: string;
};

type PushJob = {
  job_id: number;
  message_id: number;
  recipient_id: string;
  sender_id: string;
  message_type: string;
  message_body: string;
  sender_nickname: string;
  sender_avatar_emoji: string;
  preview_enabled: boolean;
  devices: PushDevice[];
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

function serviceRoleKey() {
  const direct = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (direct) return direct;
  const raw = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (!raw) throw new Error("Missing Supabase service-role secret.");
  const parsed = JSON.parse(raw);
  const key = parsed?.default;
  if (!key) throw new Error("Missing default Supabase secret key.");
  return String(key);
}

function firebaseServiceAccount() {
  const raw = Deno.env.get("FIREBASE_SERVICE_ACCOUNT_JSON");
  if (!raw) throw new Error("Missing FIREBASE_SERVICE_ACCOUNT_JSON.");
  const parsed = JSON.parse(raw);
  if (!parsed?.project_id || !parsed?.client_email || !parsed?.private_key) {
    throw new Error("Firebase service account is incomplete.");
  }
  return parsed as {
    project_id: string;
    client_email: string;
    private_key: string;
  };
}

async function accessToken(serviceAccount: ReturnType<typeof firebaseServiceAccount>) {
  const client = new JWT({
    email: serviceAccount.client_email,
    key: serviceAccount.private_key,
    scopes: ["https://www.googleapis.com/auth/firebase.messaging"],
  });
  const result = await client.authorize();
  if (!result.access_token) throw new Error("Firebase OAuth token missing.");
  return result.access_token;
}

function notificationBody(job: PushJob) {
  if (!job.preview_enabled) return "New Idesüss message";
  if (job.message_type === "friend_request") return "New friend request";
  if (job.message_type === "system") return "New system message";
  const body = String(job.message_body || "").trim();
  return body.length > 180 ? body.slice(0, 177) + "..." : (body || "New Idesüss message");
}

async function sendFcm(
  projectId: string,
  token: string,
  oauthToken: string,
  job: PushJob,
) {
  const response = await fetch(
    `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${oauthToken}`,
      },
      body: JSON.stringify({
        message: {
          token,
          notification: {
            title: job.sender_nickname || "Idesüss",
            body: notificationBody(job),
          },
          data: {
            target: "messages_conversation",
            message_id: String(job.message_id),
            sender_id: String(job.sender_id),
            message_type: String(job.message_type || "user"),
          },
          android: {
            priority: "high",
            notification: {
              channel_id: "idesuss_messages",
              sound: "default",
            },
          },
          apns: {
            headers: {
              "apns-priority": "10",
            },
            payload: {
              aps: {
                sound: "default",
              },
            },
          },
        },
      }),
    },
  );

  const payload = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, payload };
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return jsonResponse({ error: "METHOD_NOT_ALLOWED" }, 405);

  const expectedSecret = Deno.env.get("PUSH_DISPATCH_SECRET");
  const suppliedSecret = req.headers.get("x-idesuss-push-secret");
  if (!expectedSecret || suppliedSecret !== expectedSecret) {
    return jsonResponse({ error: "UNAUTHORIZED" }, 401);
  }

  try {
    const serviceAccount = firebaseServiceAccount();
    const oauthToken = await accessToken(serviceAccount);
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      serviceRoleKey(),
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

    const requestedLimit = Number(new URL(req.url).searchParams.get("limit") || "20");
    const batchLimit = Math.max(1, Math.min(Number.isFinite(requestedLimit) ? requestedLimit : 20, 100));

    const { data: claimed, error: claimError } = await supabase.rpc(
      "claim_push_notification_jobs",
      { p_limit: batchLimit },
    );
    if (claimError) throw claimError;

    const jobs = Array.isArray(claimed) ? claimed as PushJob[] : [];
    const summary = { claimed: jobs.length, sent: 0, partial: 0, failed: 0, suppressed: 0 };

    for (const job of jobs) {
      const devices = Array.isArray(job.devices) ? job.devices : [];
      if (devices.length === 0) {
        await supabase.rpc("finish_push_notification_job", {
          p_job_id: job.job_id,
          p_status: "suppressed",
          p_error: "NO_ENABLED_DEVICE",
        });
        summary.suppressed += 1;
        continue;
      }

      let successes = 0;
      const errors: string[] = [];

      for (const device of devices) {
        const result = await sendFcm(
          serviceAccount.project_id,
          device.push_token,
          oauthToken,
          job,
        );

        if (result.ok) {
          successes += 1;
          continue;
        }

        const detail = JSON.stringify(result.payload).slice(0, 500);
        errors.push(`HTTP ${result.status}: ${detail}`);

        const errorCode = String((result.payload as any)?.error?.details?.[0]?.errorCode || "");
        if (
          result.status === 404 ||
          errorCode === "UNREGISTERED" ||
          errorCode === "INVALID_ARGUMENT"
        ) {
          await supabase
            .from("device_push_tokens")
            .update({ enabled: false, updated_at: new Date().toISOString() })
            .eq("push_token", device.push_token);
        }
      }

      const status =
        successes === devices.length
          ? "sent"
          : successes > 0
            ? "partial"
            : "failed";

      await supabase.rpc("finish_push_notification_job", {
        p_job_id: job.job_id,
        p_status: status,
        p_error: errors.join(" | ").slice(0, 1000) || null,
      });

      if (status === "sent") summary.sent += 1;
      else if (status === "partial") summary.partial += 1;
      else summary.failed += 1;
    }

    return jsonResponse(summary);
  } catch (error) {
    console.error("messaging-push-dispatch failed", error);
    return jsonResponse(
      {
        error: "PUSH_DISPATCH_FAILED",
        message: error instanceof Error ? error.message : "Unknown push error",
      },
      500,
    );
  }
});
