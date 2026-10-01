import { it, expect } from "vitest";
import { onboardingSchema, otpSchema, emailSchema } from "./validation";
it("requires a focus and real IANA timezone", () => {
  expect(
    onboardingSchema.safeParse({ focus: "Strength", timezone: "UTC" }).success,
  ).toBe(false);
  expect(
    onboardingSchema.safeParse({ focus: "Perception", timezone: "Mars/Crater" })
      .success,
  ).toBe(false);
  expect(
    onboardingSchema.safeParse({ focus: "Vitality", timezone: "Asia/Kolkata" })
      .success,
  ).toBe(true);
});
it("validates typed six digit OTP and email", () => {
  expect(otpSchema.safeParse("123456").success).toBe(true);
  expect(otpSchema.safeParse("12345").success).toBe(false);
  expect(emailSchema.safeParse("bad").success).toBe(false);
});
