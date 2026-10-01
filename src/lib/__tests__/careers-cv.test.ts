// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { CV_MAX_BYTES, validateCvFile } from "@/lib/careers";
import { sendMail } from "@/lib/mailer";

describe("validateCvFile", () => {
  it("accepts PDF and Word files", () => {
    expect(validateCvFile({ name: "cv.pdf", type: "application/pdf", size: 1000 })).toBeNull();
    expect(
      validateCvFile({
        name: "cv.docx",
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        size: 1000,
      }),
    ).toBeNull();
    expect(validateCvFile({ name: "cv.doc", type: "", size: 1000 })).toBeNull();
  });

  it("rejects other types and oversized files", () => {
    expect(validateCvFile({ name: "cv.exe", type: "application/x-msdownload", size: 10 })).toBe("cvType");
    expect(validateCvFile({ name: "cv.png", type: "image/png", size: 10 })).toBe("cvType");
    expect(validateCvFile({ name: "cv.pdf", type: "application/pdf", size: CV_MAX_BYTES + 1 })).toBe("cvTooLarge");
  });
});

describe("sendMail attachments", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("sends attachments to Resend as base64", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: "e1" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await sendMail({
      to: "info@suplymate.com",
      subject: "Application",
      text: "hi",
      attachments: [{ filename: "cv.pdf", content: Buffer.from("%PDF") }],
    });

    const payload = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(payload.attachments).toEqual([{ filename: "cv.pdf", content: Buffer.from("%PDF").toString("base64") }]);
  });
});
