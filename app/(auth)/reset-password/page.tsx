"use client";

import { Eye, EyeOff, Lock } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getErrorMessage, resetPassword } from "@/lib/api";

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";
  const otp = searchParams.get("otp") || "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    try {
      setIsLoading(true);
      await resetPassword({
        email,
        otp,
        newPassword,
        confirmPassword,
      });
      toast.success("Password reset successfully.");
      router.push("/login");
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_20%_35%,rgba(63,101,151,.4),transparent_40%),radial-gradient(circle_at_80%_20%,rgba(97,132,186,.25),transparent_40%),linear-gradient(130deg,#152947_0%,#1b3157_43%,#192f54_100%)] px-4">
      <Card className="w-full max-w-xl border-[#8cc9f399] shadow-[0_25px_80px_-45px_rgba(0,0,0,.95)]">
        <CardContent className="space-y-6 p-8">
          <div className="space-y-2 text-center">
            <h1 className="font-display text-4xl font-semibold text-white">Reset Password</h1>
            <p className="text-base text-slate-300">Create a new password</p>
          </div>

          <form className="space-y-4" onSubmit={onSubmit}>
            <label className="block space-y-2">
              <span className="flex items-center gap-2 text-2xl font-medium text-white">
                <Lock className="size-5" />
                Create Password
              </span>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  required
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300"
                  onClick={() => setShowPassword((prev) => !prev)}
                >
                  {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                </button>
              </div>
            </label>

            <label className="block space-y-2">
              <span className="flex items-center gap-2 text-2xl font-medium text-white">
                <Lock className="size-5" />
                Confirm Password
              </span>
              <Input
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
              />
            </label>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Updating..." : "Continue"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_20%_35%,rgba(63,101,151,.4),transparent_40%),radial-gradient(circle_at_80%_20%,rgba(97,132,186,.25),transparent_40%),linear-gradient(130deg,#152947_0%,#1b3157_43%,#192f54_100%)] px-4">
      <Card className="w-full max-w-xl border-[#8cc9f399] shadow-[0_25px_80px_-45px_rgba(0,0,0,.95)]">
        <CardContent className="p-8 text-center text-slate-300">Loading...</CardContent>
      </Card>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <ResetPasswordContent />
    </Suspense>
  );
}
