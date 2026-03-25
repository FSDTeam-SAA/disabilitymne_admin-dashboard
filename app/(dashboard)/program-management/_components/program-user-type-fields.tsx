"use client";

import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

type PremiumUserOption = {
  id: string;
  firstName: string;
  email: string;
};

interface ProgramUserTypeFieldsProps {
  userType: string;
  assignedUser: string;
  premiumUsers: PremiumUserOption[];
  onUserTypeChange: (value: string) => void;
  onAssignedUserChange: (value: string) => void;
}

export function ProgramUserTypeFields({
  userType,
  assignedUser,
  premiumUsers,
  onUserTypeChange,
  onAssignedUserChange,
}: ProgramUserTypeFieldsProps) {
  return (
    <>
      <div className="space-y-2">
        <Label className="text-xs">User type</Label>
        <Select value={userType} className="h-10" onChange={(event) => onUserTypeChange(event.target.value)}>
          <option value="normal_user">Normal user</option>
          <option value="premium_user">Premium user</option>
        </Select>
      </div>

      {userType === "premium_user" ? (
        <div className="space-y-2 md:col-span-2">
          <Label className="text-xs">Assigned Premium User</Label>
          <Select value={assignedUser} onChange={(event) => onAssignedUserChange(event.target.value)} required>
            <option value="">Select premium user</option>
            {premiumUsers.map((user) => (
              <option key={user.id} value={user.id}>
                {user.firstName} ({user.email})
              </option>
            ))}
          </Select>
        </div>
      ) : null}
    </>
  );
}
