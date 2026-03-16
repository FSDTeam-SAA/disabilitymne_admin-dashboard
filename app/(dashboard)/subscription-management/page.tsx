"use client";

import { Edit3, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { PageTitle } from "@/components/shared/page-title";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  createSubscriptionPlan,
  deleteSubscriptionPlan,
  getErrorMessage,
  getSubscriptionPlans,
  updateSubscriptionPlan,
  type SubscriptionPlan,
} from "@/lib/api";
import { formatCurrency } from "@/lib/utils";

const defaultForm = {
  key: "monthly_plan",
  name: "",
  price: "29.99",
  currency: "USD",
  durationLabel: "1 month",
  durationMonths: "1",
  trialDays: "0",
  features: "",
};

export default function SubscriptionManagementPage() {
  const queryClient = useQueryClient();
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [formData, setFormData] = useState(defaultForm);

  const plansQuery = useQuery({
    queryKey: ["subscription-plans"],
    queryFn: () => getSubscriptionPlans(true),
  });

  const createMutation = useMutation({
    mutationFn: createSubscriptionPlan,
    onSuccess: () => {
      toast.success("Plan created.");
      setFormOpen(false);
      setFormData(defaultForm);
      queryClient.invalidateQueries({ queryKey: ["subscription-plans"] });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const updateMutation = useMutation({
    mutationFn: ({ key, payload }: { key: string; payload: Parameters<typeof updateSubscriptionPlan>[1] }) =>
      updateSubscriptionPlan(key, payload),
    onSuccess: () => {
      toast.success("Plan updated.");
      setFormOpen(false);
      setSelectedPlan(null);
      setFormData(defaultForm);
      queryClient.invalidateQueries({ queryKey: ["subscription-plans"] });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteSubscriptionPlan,
    onSuccess: () => {
      toast.success("Plan deleted.");
      setDeleteOpen(false);
      setSelectedPlan(null);
      queryClient.invalidateQueries({ queryKey: ["subscription-plans"] });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const plans = useMemo(() => (plansQuery.data || []).filter((plan) => plan.isActive), [plansQuery.data]);

  const onOpenCreate = () => {
    setSelectedPlan(null);
    setFormData(defaultForm);
    setFormOpen(true);
  };

  const onOpenEdit = (plan: SubscriptionPlan) => {
    setSelectedPlan(plan);
    setFormData({
      key: plan.key,
      name: plan.name,
      price: String(plan.price),
      currency: plan.currency,
      durationLabel: plan.durationLabel,
      durationMonths: String(plan.durationMonths),
      trialDays: String(plan.trialDays),
      features: (plan.features || []).join("\n"),
    });
    setFormOpen(true);
  };

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const payload = {
      key: formData.key as "free_trial" | "monthly_plan" | "six_month_plan" | "premium_plan",
      name: formData.name,
      price: Number(formData.price),
      currency: formData.currency,
      durationLabel: formData.durationLabel,
      durationMonths: Number(formData.durationMonths),
      trialDays: Number(formData.trialDays),
      features: formData.features
        .split(/\n|,/)
        .map((item) => item.trim())
        .filter(Boolean),
    };

    if (selectedPlan) {
      updateMutation.mutate({ key: selectedPlan.key, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  return (
    <div className="space-y-5">
      <PageTitle
        title="Subscription Management"
        breadcrumb="Dashboard  >  Subscription Management"
        action={
          <Button className="w-full md:w-auto" onClick={onOpenCreate}>
            <Plus className="mr-2 size-4" />
            Add new Subscription
          </Button>
        }
      />

      {plansQuery.isLoading ? (
        <div className="grid grid-cols-1 gap-4">
          <Card><CardContent className="h-40" /></Card>
          <Card><CardContent className="h-40" /></Card>
          <Card><CardContent className="h-40" /></Card>
        </div>
      ) : plans.length === 0 ? (
        <EmptyState title="No plans" description="Create your first plan." />
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {plans.map((plan, index) => {
            const borderColor =
              index % 4 === 0
                ? "border-[#3dcc5f]"
                : index % 4 === 1
                  ? "border-[#1890ff]"
                  : index % 4 === 2
                    ? "border-[#ffcb00]"
                    : "border-[#ff9f31]";

            return (
              <Card key={plan.key} className={`border-2 ${borderColor}`}>
                <CardContent className="space-y-4 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-4xl font-semibold text-white">{plan.name}</h3>
                      <p className="text-sm text-slate-300">{plan.durationLabel}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-4xl font-bold text-white">{formatCurrency(plan.price)}</p>
                      <div className="mt-2 flex justify-end gap-2">
                        <Button variant="secondary" size="icon" onClick={() => onOpenEdit(plan)}>
                          <Edit3 className="size-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="icon"
                          onClick={() => {
                            setSelectedPlan(plan);
                            setDeleteOpen(true);
                          }}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  <ul className="space-y-2 text-sm text-slate-100">
                    {(plan.features || []).map((feature) => (
                      <li key={`${plan.key}-${feature}`} className="flex items-start gap-2">
                        <span className="mt-1 size-2 rounded-full bg-[#72B4E6]" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setSelectedPlan(null);
        }}
        title={selectedPlan ? `Edit ${selectedPlan.name}` : "Add Subscription Plan"}
      >
        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Plan Key</Label>
              <Select
                value={formData.key}
                disabled={Boolean(selectedPlan)}
                onChange={(event) => setFormData((prev) => ({ ...prev, key: event.target.value }))}
              >
                <option value="free_trial">Free Trial</option>
                <option value="monthly_plan">Monthly Plan</option>
                <option value="six_month_plan">Six Month Plan</option>
                <option value="premium_plan">Premium Plan</option>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Plan Name</Label>
              <Input
                value={formData.name}
                onChange={(event) => setFormData((prev) => ({ ...prev, name: event.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Plan Price</Label>
              <Input
                type="number"
                min={0}
                value={formData.price}
                onChange={(event) => setFormData((prev) => ({ ...prev, price: event.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Currency</Label>
              <Input
                value={formData.currency}
                onChange={(event) => setFormData((prev) => ({ ...prev, currency: event.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Plan Duration Label</Label>
              <Input
                value={formData.durationLabel}
                onChange={(event) => setFormData((prev) => ({ ...prev, durationLabel: event.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Duration Months</Label>
              <Input
                type="number"
                min={0}
                value={formData.durationMonths}
                onChange={(event) => setFormData((prev) => ({ ...prev, durationMonths: event.target.value }))}
                required
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Trial Days</Label>
              <Input
                type="number"
                min={0}
                value={formData.trialDays}
                onChange={(event) => setFormData((prev) => ({ ...prev, trialDays: event.target.value }))}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Plan Features (comma or new line)</Label>
              <Textarea
                value={formData.features}
                onChange={(event) => setFormData((prev) => ({ ...prev, features: event.target.value }))}
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 pt-2 md:grid-cols-2">
            <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
              {createMutation.isPending || updateMutation.isPending
                ? "Saving..."
                : selectedPlan
                  ? "Save Plan"
                  : "Create Plan"}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => {
          if (selectedPlan) {
            deleteMutation.mutate(selectedPlan.key);
          }
        }}
        title="Are you sure?"
        description="You want to delete this subscription plan from dashboard and user app."
        confirmText="Delete"
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
