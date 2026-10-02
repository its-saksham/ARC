import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { expect, it, vi, beforeEach } from "vitest";
import { Auth } from "./Auth";
const mocks = vi.hoisted(() => ({ send: vi.fn(), verify: vi.fn() }));
vi.mock("../lib/api", () => ({
  configured: true,
  supabase: { auth: { signInWithOtp: mocks.send, verifyOtp: mocks.verify } },
}));
beforeEach(() => {
  vi.clearAllMocks();
  mocks.send.mockResolvedValue({ error: null });
  mocks.verify.mockResolvedValue({ error: null });
});
it("shows send errors and lets users retry", async () => {
  mocks.send.mockResolvedValueOnce({
    error: { message: "Email delivery unavailable" },
  });
  render(<Auth />);
  fireEvent.change(screen.getByLabelText("Email address"), {
    target: { value: "beta@example.com" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Send code" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Email delivery unavailable",
  );
});
it("uses typed OTP, prevents resends during cooldown and displays verification errors", async () => {
  mocks.verify.mockResolvedValue({ error: { message: "Code expired" } });
  render(<Auth />);
  fireEvent.change(screen.getByLabelText("Email address"), {
    target: { value: "beta@example.com" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Send code" }));
  const input = await screen.findByLabelText("Verification code");
  expect(screen.getByRole("button", { name: /Resend/ })).toBeDisabled();
  fireEvent.change(input, { target: { value: "123456" } });
  fireEvent.click(screen.getByRole("button", { name: "Verify code" }));
  await waitFor(() =>
    expect(screen.getByRole("alert")).toHaveTextContent("Code expired"),
  );
  expect(mocks.verify).toHaveBeenCalledWith({
    email: "beta@example.com",
    token: "123456",
    type: "email",
  });
});
