"use client";

import { Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { forgotPasswordSendOtp, getErrorMessage } from "@/lib/api";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      setIsLoading(true);
      const response = await forgotPasswordSendOtp(email);
      toast.success(response.message || "OTP sent successfully.");
      router.push(`/verify-otp?email=${encodeURIComponent(email)}`);
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
            <h1 className="font-display text-4xl font-semibold text-white">Forgot Password</h1>
            <p className="text-base text-slate-300">Enter your email to recover your password</p>
          </div>

          <form className="space-y-4" onSubmit={onSubmit}>
            <label className="block space-y-2">
              <span className="flex items-center gap-2 text-2xl font-medium text-white">
                <Mail className="size-5" />
                Email address
              </span>
              <Input
                type="email"
                placeholder="name@company.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </label>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Sending OTP..." : "Send Otp"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
