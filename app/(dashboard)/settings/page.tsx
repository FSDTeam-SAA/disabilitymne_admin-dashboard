"use client";

import { SquarePen } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { PageTitle } from "@/components/shared/page-title";
import { TableSkeleton } from "@/components/shared/table-skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  getAdminSettingsProfile,
  getErrorMessage,
  updateAdminSettingsPassword,
  updateAdminSettingsProfile,
  updateAdminSettingsProfileImage,
} from "@/lib/api";

type ProfileForm = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  bio: string;
  profileImage: string;
};

const initialPassword = {
  currentPassword: "",
  newPassword: "",
  confirmNewPassword: "",
};

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const profileImageInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<"profile" | "password">("profile");
  const [isProfileEditing, setIsProfileEditing] = useState(false);
  const [profileEdits, setProfileEdits] = useState<Partial<ProfileForm>>({});
  const [passwordData, setPasswordData] = useState(initialPassword);

  const profileQuery = useQuery({
    queryKey: ["admin-settings-profile"],
    queryFn: getAdminSettingsProfile,
  });

  const profileFromApi = useMemo(
    () => ({
      firstName: String(profileQuery.data?.firstName || ""),
      lastName: String(profileQuery.data?.lastName || ""),
      email: String(profileQuery.data?.email || ""),
      phone: String(profileQuery.data?.phone || ""),
      bio: String(profileQuery.data?.bio || ""),
      profileImage: String(profileQuery.data?.profileImage || ""),
    }),
    [profileQuery.data]
  );

  const profileData = useMemo(
    () => ({
      ...profileFromApi,
      ...profileEdits,
    }),
    [profileEdits, profileFromApi]
  );

  const profileMutation = useMutation({
    mutationFn: updateAdminSettingsProfile,
    onSuccess: () => {
      toast.success("Profile updated successfully.");
      queryClient.invalidateQueries({ queryKey: ["admin-settings-profile"] });
      setIsProfileEditing(false);
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const profileImageMutation = useMutation({
    mutationFn: updateAdminSettingsProfileImage,
    onSuccess: (updatedProfile) => {
      toast.success("Profile image updated successfully.");
      setProfileEdits((prev) => ({
        ...prev,
        profileImage: String(updatedProfile?.profileImage || ""),
      }));
      queryClient.invalidateQueries({ queryKey: ["admin-settings-profile"] });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const passwordMutation = useMutation({
    mutationFn: updateAdminSettingsPassword,
    onSuccess: () => {
      toast.success("Password updated. Please sign in again.");
      setPasswordData(initialPassword);
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  return (
    <div className="space-y-5">
      <PageTitle title="Settings" breadcrumb="Dashboard  >  Settings" />

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <button
          type="button"
          onClick={() => setActiveTab("profile")}
          className={`h-11 rounded-md border text-sm font-medium transition-colors ${
            activeTab === "profile"
              ? "border-[#8ecaf2] bg-[#72B4E6] text-[#112f52]"
              : "border-white/25 bg-white/95 text-[#4b5a78]"
          }`}
        >
          Personal Information
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("password")}
          className={`h-11 rounded-md border text-sm font-medium transition-colors ${
            activeTab === "password"
              ? "border-[#8ecaf2] bg-[#72B4E6] text-[#112f52]"
              : "border-white/25 bg-white/95 text-[#4b5a78]"
          }`}
        >
          Change Password
        </button>
      </div>

      {profileQuery.isLoading ? (
        <TableSkeleton rows={6} />
      ) : activeTab === "profile" ? (
        <Card className="overflow-hidden border-[#80b8df42]">
          <CardContent className="space-y-5 p-4">
            <div className="flex flex-col gap-4 rounded-lg border border-white/10 bg-[radial-gradient(circle_at_50%_50%,rgba(114,180,230,.16)_0%,rgba(20,45,78,.2)_44%,rgba(14,32,60,.2)_100%)] p-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-3">
                {profileData.profileImage ? (
                  <img src={profileData.profileImage} alt="Profile" className="size-16 rounded-full object-cover" />
                ) : (
                  <div className="flex size-16 items-center justify-center rounded-full bg-white/10 text-xl font-semibold">
                    {profileData.firstName.trim().charAt(0).toUpperCase() || "A"}
                  </div>
                )}
                <div>
                  <p className="text-3xl font-semibold text-white">{`${profileData.firstName} ${profileData.lastName}`.trim() || "Admin"}</p>
                  <p className="text-sm text-slate-300">@{String(profileQuery.data?.role || "admin")}</p>
                </div>
              </div>
              <Button
                type="button"
                className="h-10 rounded-md bg-[#72B4E6] px-6 text-sm font-medium text-white hover:bg-[#84c4ef]"
                disabled={profileImageMutation.isPending}
                onClick={() => profileImageInputRef.current?.click()}
              >
                <SquarePen className="mr-2 size-4" />
                {profileImageMutation.isPending ? "Uploading..." : "Edit"}
              </Button>
              <input
                ref={profileImageInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  const selectedFile = event.target.files?.[0];
                  if (!selectedFile) return;
                  profileImageMutation.mutate(selectedFile);
                  event.target.value = "";
                }}
              />
            </div>

            <form
              className="space-y-4 rounded-lg border border-white/15 p-4"
              onSubmit={(event) => {
                event.preventDefault();
                profileMutation.mutate(profileData);
              }}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-3xl font-semibold text-white">Personal Information</p>
                <Button
                  type="button"
                  className="h-10 rounded-md bg-[#72B4E6] px-6 text-sm font-medium text-white hover:bg-[#84c4ef]"
                  onClick={() => setIsProfileEditing((prev) => !prev)}
                >
                  <SquarePen className="mr-2 size-4" />
                  Edit
                </Button>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>First Name</Label>
                  <Input
                    value={profileData.firstName}
                    onChange={(event) => setProfileEdits((prev) => ({ ...prev, firstName: event.target.value }))}
                    readOnly={!isProfileEditing}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Last Name</Label>
                  <Input
                    value={profileData.lastName}
                    onChange={(event) => setProfileEdits((prev) => ({ ...prev, lastName: event.target.value }))}
                    readOnly={!isProfileEditing}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email Address</Label>
                  <Input
                    type="email"
                    value={profileData.email}
                    onChange={(event) => setProfileEdits((prev) => ({ ...prev, email: event.target.value }))}
                    readOnly={!isProfileEditing}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input
                    value={profileData.phone}
                    onChange={(event) => setProfileEdits((prev) => ({ ...prev, phone: event.target.value }))}
                    readOnly={!isProfileEditing}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Bio</Label>
                <Textarea
                  value={profileData.bio}
                  onChange={(event) => setProfileEdits((prev) => ({ ...prev, bio: event.target.value }))}
                  readOnly={!isProfileEditing}
                />
              </div>

              {isProfileEditing ? (
                <div className="grid grid-cols-1 gap-3 pt-2 md:grid-cols-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setProfileEdits({});
                      setIsProfileEditing(false);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={profileMutation.isPending}>
                    {profileMutation.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              ) : null}
            </form>
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden border-[#80b8df42]">
          <CardContent className="space-y-4 p-4">
            <form
              className="space-y-4 rounded-lg border border-white/15 p-4"
              onSubmit={(event) => {
                event.preventDefault();
                passwordMutation.mutate(passwordData);
              }}
            >
              <div className="space-y-2">
                <Label>Current Password</Label>
                <Input
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(event) => setPasswordData((prev) => ({ ...prev, currentPassword: event.target.value }))}
                  required
                />
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>New Password</Label>
                  <Input
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(event) => setPasswordData((prev) => ({ ...prev, newPassword: event.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Confirm New Password</Label>
                  <Input
                    type="password"
                    value={passwordData.confirmNewPassword}
                    onChange={(event) => setPasswordData((prev) => ({ ...prev, confirmNewPassword: event.target.value }))}
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 pt-2 md:grid-cols-2">
                <Button type="button" variant="outline" onClick={() => setPasswordData(initialPassword)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={passwordMutation.isPending}>
                  {passwordMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
