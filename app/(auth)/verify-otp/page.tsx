"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getErrorMessage, verifyPasswordOtp } from "@/lib/api";

function VerifyOtpContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [isLoading, setIsLoading] = useState(false);

  const otpValue = useMemo(() => otp.join(""), [otp]);

  const setDigit = (value: string, index: number) => {
    const next = [...otp];
    next[index] = value.slice(-1);
    setOtp(next);
  };

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (otpValue.length !== 6) {
      toast.error("Please enter a 6-digit OTP.");
      return;
    }

    try {
      setIsLoading(true);
      await verifyPasswordOtp(email, otpValue);
      toast.success("OTP verified.");
      router.push(`/reset-password?email=${encodeURIComponent(email)}&otp=${encodeURIComponent(otpValue)}`);
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
            <h1 className="font-display text-4xl font-semibold text-white">Enter OTP</h1>
            <p className="text-base text-slate-300">Enter 6 digit OTP code sent to your email</p>
          </div>

          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="grid grid-cols-6 gap-2">
              {otp.map((digit, index) => (
                <Input
                  key={`otp-${index}`}
                  value={digit}
                  onChange={(event) => setDigit(event.target.value.replace(/\D/g, ""), index)}
                  maxLength={1}
                  className="h-14 text-center text-2xl"
                />
              ))}
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Verifying..." : "Verify now"}
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

export default function VerifyOtpPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <VerifyOtpContent />
    </Suspense>
  );
}
