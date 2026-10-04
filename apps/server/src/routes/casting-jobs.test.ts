import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";

import app from "../index";

const signUp = async (name: string) => {
  const username = name.toLowerCase().replaceAll(" ", "");
  const response = await app.request(
    "/api/auth/sign-up/email",
    {
      body: JSON.stringify({
        email: `${username}@example.com`,
        name,
        password: "password-12345678",
        username,
      }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    },
    env
  );

  expect(response.status).toBe(200);

  const cookie = response.headers.get("set-cookie");
  const body = (await response.json()) as { user: { id: string } };

  return { cookie: cookie ?? "", id: body.user.id };
};

const createJob = async (cookie: string) => {
  const response = await app.request(
    "/api/v1/casting-jobs",
    {
      body: JSON.stringify({
        priceCents: 2500,
        requestedHours: 2,
        startsAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      }),
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
      },
      method: "POST",
    },
    env
  );

  expect(response.status).toBe(201);
  const body = (await response.json()) as { job: { id: string } };
  return body.job.id;
};

const patchStatus = (id: string, cookie: string, status: string) =>
  app.request(
    `/api/v1/casting-jobs/${id}/status`,
    {
      body: JSON.stringify({ status }),
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
      },
      method: "PATCH",
    },
    env
  );

describe("casting job status transitions", () => {
  it("lets the requester submit and cancel, but not complete", async () => {
    const requester = await signUp("Dana Requester");

    const submittedJobId = await createJob(requester.cookie);
    // Jobs are created as requested; restating the current status is a no-op.
    const restated = await patchStatus(
      submittedJobId,
      requester.cookie,
      "requested"
    );
    expect(restated.status).toBe(200);

    const cancelJobId = await createJob(requester.cookie);
    const cancelled = await patchStatus(
      cancelJobId,
      requester.cookie,
      "cancelled"
    );
    expect(cancelled.status).toBe(200);

    const reopened = await patchStatus(
      cancelJobId,
      requester.cookie,
      "requested"
    );
    expect(reopened.status).toBe(403);

    const completed = await patchStatus(
      await createJob(requester.cookie),
      requester.cookie,
      "completed"
    );
    expect(completed.status).toBe(403);
  });

  it("walks the caster through the on-site lifecycle in order", async () => {
    const requester = await signUp("Evan Requester");
    const caster = await signUp("Fay Caster");
    const stranger = await signUp("Gus Stranger");

    const jobId = await createJob(requester.cookie);
    await env.DB.prepare(
      "insert into caster_profile (user_id, display_name, status) values (?, ?, ?)"
    )
      .bind(caster.id, "Fay Caster", "active")
      .run();
    await env.DB.prepare(
      "update casting_job set caster_user_id = ?, status = ? where id = ?"
    )
      .bind(caster.id, "accepted", jobId)
      .run();

    const strangerAttempt = await patchStatus(
      jobId,
      stranger.cookie,
      "arrived"
    );
    expect(strangerAttempt.status).toBe(404);

    const skipAhead = await patchStatus(jobId, caster.cookie, "completed");
    expect(skipAhead.status).toBe(403);

    for (const status of ["arrived", "recording", "uploading", "completed"]) {
      // oxlint-disable-next-line eslint/no-await-in-loop -- sequential test setup
      const response = await patchStatus(jobId, caster.cookie, status);
      expect(response.status).toBe(200);
    }

    const afterComplete = await patchStatus(jobId, caster.cookie, "failed");
    expect(afterComplete.status).toBe(403);
  });
});
