import { z } from "zod";
export const emailSchema = z
  .string()
  .trim()
  .email("Enter a valid email address.");
export const otpSchema = z
  .string()
  .regex(/^\d{6}$/, "Enter the six-digit code from your email.");
export const onboardingSchema = z.object({
  focus: z.enum(["Perception", "Vitality", "Intelligence"]),
  timezone: z.string().refine((tz) => {
    try {
      new Intl.DateTimeFormat("en", { timeZone: tz });
      return tz === "UTC" || tz.includes("/");
    } catch {
      return false;
    }
  }, "Enter a valid IANA timezone, such as Asia/Kolkata."),
});
