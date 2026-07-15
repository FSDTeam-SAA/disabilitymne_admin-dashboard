"use client";

import { ArrowLeft, Upload, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";

import { EmptyState } from "@/components/shared/empty-state";
import { PageTitle } from "@/components/shared/page-title";
import { TableSkeleton } from "@/components/shared/table-skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  createNutritionPlan,
  createProgram,
  getAdminExercises,
  getAdminNutritionPlanById,
  getAdminPremiumUserById,
  getAdminProgramById,
  getAdminRecipes,
  getErrorMessage,
  updateNutritionPlan,
  updateProgram,
} from "@/lib/api";
import { cn } from "@/lib/utils";

const WEEKDAY_OPTIONS: Array<{ dayIndex: number; label: string }> = [
  { dayIndex: 1, label: "Mon" },
  { dayIndex: 2, label: "Tue" },
  { dayIndex: 3, label: "Wed" },
  { dayIndex: 4, label: "Thu" },
  { dayIndex: 5, label: "Fri" },
  { dayIndex: 6, label: "Sat" },
  { dayIndex: 7, label: "Sun" },
];

const DEFAULT_DAY_INDICES = [1, 3, 5];

type WorkoutDayAssignment = { dayIndex: number; exerciseIds: string[] };
type NutritionDayDraft = {
  dayIndex: number;
  meals: Array<{ recipe: string; mealType: string; order: number }>;
};

const fieldClass =
  "h-10 w-full rounded border border-[#7cb6df66] bg-[#1b3457]/80 px-3 text-sm text-slate-100 outline-none ring-0 transition focus:border-[#93ceff99]";

const uploadLabelClass =
  "flex h-14 cursor-pointer items-center justify-center gap-2 rounded border border-[#7cb6df66] bg-[#1b3457]/50 text-xs text-slate-100 transition hover:bg-[#23456f]/55";

const normalizeWorkoutDays = (days: WorkoutDayAssignment[]) => {
  const seen = new Set<number>();
  return (Array.isArray(days) ? days : [])
    .map((day) => ({
      dayIndex: Number(day.dayIndex),
      exerciseIds: (Array.isArray(day.exerciseIds) ? day.exerciseIds : [])
        .map((id) => String(id).trim())
        .filter(Boolean),
    }))
    .filter((day) => day.dayIndex >= 1 && day.dayIndex <= 7)
    .filter((day) => {
      if (seen.has(day.dayIndex)) return false;
      seen.add(day.dayIndex);
      return true;
    })
    .sort((a, b) => a.dayIndex - b.dayIndex);
};

const getDayLabel = (dayIndex: number) =>
  WEEKDAY_OPTIONS.find((day) => day.dayIndex === dayIndex)?.label || `Day ${dayIndex}`;

export default function PremiumUserDetailPage() {
  const params = useParams<{ userId: string }>();
  const userId = String(params.userId || "");
  const router = useRouter();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<"workout" | "nutrition">("workout");
  const [editingProgramId, setEditingProgramId] = useState<string | null>(null);
  const [editingNutritionId, setEditingNutritionId] = useState<string | null>(null);

  const [programName, setProgramName] = useState("");
  const [programDescription, setProgramDescription] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("45");
  const [programLevel, setProgramLevel] = useState("beginner");
  const [mobilityType, setMobilityType] = useState("");
  const [programStatus, setProgramStatus] = useState("published");
  const [existingProgramImages, setExistingProgramImages] = useState<string[]>([]);
  const [existingProgramThumbnails, setExistingProgramThumbnails] = useState<string[]>([]);
  const [programImageFiles, setProgramImageFiles] = useState<File[]>([]);
  const [programThumbnailFiles, setProgramThumbnailFiles] = useState<File[]>([]);
  const [workoutDays, setWorkoutDays] = useState<WorkoutDayAssignment[]>(
    DEFAULT_DAY_INDICES.map((dayIndex) => ({ dayIndex, exerciseIds: [] }))
  );
  const [activePlannerDay, setActivePlannerDay] = useState<number>(1);
  const [exerciseSearch, setExerciseSearch] = useState("");

  const [nutritionTitle, setNutritionTitle] = useState("");
  const [nutritionDescription, setNutritionDescription] = useState("");
  const [nutritionDays, setNutritionDays] = useState<NutritionDayDraft[]>(
    WEEKDAY_OPTIONS.map((day) => ({ dayIndex: day.dayIndex, meals: [] }))
  );
  const [selectedNutritionDay, setSelectedNutritionDay] = useState(1);
  const [recipeSearch, setRecipeSearch] = useState("");

  const programImagePreviews = useMemo(
    () => programImageFiles.map((file) => URL.createObjectURL(file)),
    [programImageFiles]
  );
  const programThumbnailPreviews = useMemo(
    () => programThumbnailFiles.map((file) => URL.createObjectURL(file)),
    [programThumbnailFiles]
  );

  useEffect(
    () => () => {
      for (const preview of programImagePreviews) URL.revokeObjectURL(preview);
    },
    [programImagePreviews]
  );

  useEffect(
    () => () => {
      for (const preview of programThumbnailPreviews) URL.revokeObjectURL(preview);
    },
    [programThumbnailPreviews]
  );

  const detailQuery = useQuery({
    queryKey: ["admin-premium-user", userId],
    queryFn: () => getAdminPremiumUserById(userId),
    enabled: Boolean(userId),
  });

  const exercisesQuery = useQuery({
    queryKey: ["admin-exercises-options-premium", exerciseSearch],
    queryFn: () =>
      getAdminExercises({
        page: 1,
        limit: 2000,
        status: "published",
        search: exerciseSearch.trim() || undefined,
      }),
  });

  const recipesQuery = useQuery({
    queryKey: ["admin-recipes-options-premium", recipeSearch],
    queryFn: () =>
      getAdminRecipes({
        page: 1,
        limit: 2000,
        status: "published",
        search: recipeSearch.trim() || undefined,
      }),
  });

  const exercises = useMemo(() => exercisesQuery.data?.data || [], [exercisesQuery.data]);
  const recipes = useMemo(() => recipesQuery.data?.data || [], [recipesQuery.data]);
  const detail = detailQuery.data;
  const normalizedWorkoutDays = useMemo(() => normalizeWorkoutDays(workoutDays), [workoutDays]);
  const activeWorkoutDay = normalizedWorkoutDays.find((day) => day.dayIndex === activePlannerDay);
  const displayedProgramImages =
    programImagePreviews.length > 0 ? programImagePreviews : existingProgramImages;
  const displayedProgramThumbnails =
    programThumbnailPreviews.length > 0 ? programThumbnailPreviews : existingProgramThumbnails;

  const resetWorkoutForm = () => {
    setEditingProgramId(null);
    setProgramName("");
    setProgramDescription("");
    setDurationMinutes("45");
    setProgramLevel("beginner");
    setMobilityType(detail?.user.mobilityType || "");
    setProgramStatus("published");
    setExistingProgramImages([]);
    setExistingProgramThumbnails([]);
    setProgramImageFiles([]);
    setProgramThumbnailFiles([]);
    setWorkoutDays(DEFAULT_DAY_INDICES.map((dayIndex) => ({ dayIndex, exerciseIds: [] })));
    setActivePlannerDay(1);
    setExerciseSearch("");
  };

  const resetNutritionForm = () => {
    setEditingNutritionId(null);
    setNutritionTitle("");
    setNutritionDescription("");
    setNutritionDays(WEEKDAY_OPTIONS.map((day) => ({ dayIndex: day.dayIndex, meals: [] })));
    setSelectedNutritionDay(1);
    setRecipeSearch("");
  };

  useEffect(() => {
    if (detail?.user.mobilityType && !editingProgramId && !mobilityType) {
      setMobilityType(detail.user.mobilityType);
    }
  }, [detail?.user.mobilityType, editingProgramId, mobilityType]);

  const loadProgram = async (programId: string) => {
    const program = await getAdminProgramById(programId);
    setEditingProgramId(program.id);
    setProgramName(program.programName || "");
    setProgramDescription(program.programDescription || "");
    setDurationMinutes(String(program.durationMinutes || 45));
    setProgramLevel(program.programLevel || "beginner");
    setMobilityType(program.mobilityType || detail?.user.mobilityType || "");
    setProgramStatus(program.status || "published");
    setExistingProgramImages(
      Array.isArray(program.programImages) && program.programImages.length > 0
        ? program.programImages
        : program.programImage
          ? [program.programImage]
          : []
    );
    setExistingProgramThumbnails(
      Array.isArray(program.programThumbnails) && program.programThumbnails.length > 0
        ? program.programThumbnails
        : program.programThumbnail
          ? [program.programThumbnail]
          : []
    );
    setProgramImageFiles([]);
    setProgramThumbnailFiles([]);
    const days =
      Array.isArray(program.workoutDays) && program.workoutDays.length > 0
        ? normalizeWorkoutDays(
            program.workoutDays.map((day) => ({
              dayIndex: day.dayIndex,
              exerciseIds: day.exerciseIds || day.exercises?.map((ex) => ex.id) || [],
            }))
          )
        : [{ dayIndex: 1, exerciseIds: program.exerciseIds || [] }];
    setWorkoutDays(days.length > 0 ? days : DEFAULT_DAY_INDICES.map((dayIndex) => ({ dayIndex, exerciseIds: [] })));
    setActivePlannerDay(days[0]?.dayIndex || 1);
    setActiveTab("workout");
  };

  const loadNutritionPlan = async (planId: string) => {
    const plan = await getAdminNutritionPlanById(planId);
    setEditingNutritionId(plan.id);
    setNutritionTitle(plan.title || "");
    setNutritionDescription(plan.description || "");
    const byDay = new Map(
      (plan.nutritionDays || []).map((day) => [
        day.dayIndex,
        (day.meals || []).map((meal, index) => ({
          recipe: meal.recipe?.id || "",
          mealType: meal.mealType || "meal",
          order: meal.order || index + 1,
        })),
      ])
    );
    setNutritionDays(
      WEEKDAY_OPTIONS.map((day) => ({
        dayIndex: day.dayIndex,
        meals: byDay.get(day.dayIndex) || [],
      }))
    );
    setSelectedNutritionDay(1);
    setActiveTab("nutrition");
  };

  const selectWorkoutPlannerDay = (dayIndex: number) => {
    const exists = normalizedWorkoutDays.some((day) => day.dayIndex === dayIndex);
    if (!exists) {
      setWorkoutDays((prev) => normalizeWorkoutDays([...prev, { dayIndex, exerciseIds: [] }]));
    }
    setActivePlannerDay(dayIndex);
  };

  const removeWorkoutPlannerDay = (dayIndex: number) => {
    setWorkoutDays((prev) => {
      const next = normalizeWorkoutDays(prev.filter((day) => day.dayIndex !== dayIndex));
      if (activePlannerDay === dayIndex) {
        setActivePlannerDay(next[0]?.dayIndex || DEFAULT_DAY_INDICES[0]);
      }
      return next;
    });
  };

  const toggleExerciseOnActiveDay = (exerciseId: string, checked: boolean) => {
    setWorkoutDays((prev) => {
      const hasDay = prev.some((day) => day.dayIndex === activePlannerDay);
      const base = hasDay ? prev : [...prev, { dayIndex: activePlannerDay, exerciseIds: [] }];
      return normalizeWorkoutDays(
        base.map((day) => {
          if (day.dayIndex !== activePlannerDay) return day;
          if (checked) {
            return { ...day, exerciseIds: [...new Set([...day.exerciseIds, exerciseId])] };
          }
          return { ...day, exerciseIds: day.exerciseIds.filter((id) => id !== exerciseId) };
        })
      );
    });
  };

  const removeProgramImageAt = (index: number) => {
    if (programImagePreviews.length > 0) {
      setProgramImageFiles((prev) => prev.filter((_, fileIndex) => fileIndex !== index));
      return;
    }
    setExistingProgramImages((prev) => prev.filter((_, imageIndex) => imageIndex !== index));
  };

  const removeProgramThumbnailAt = (index: number) => {
    if (programThumbnailPreviews.length > 0) {
      setProgramThumbnailFiles((prev) => prev.filter((_, fileIndex) => fileIndex !== index));
      return;
    }
    setExistingProgramThumbnails((prev) => prev.filter((_, imageIndex) => imageIndex !== index));
  };

  const saveWorkoutMutation = useMutation({
    mutationFn: async () => {
      if (!programName.trim()) throw new Error("Program name is required.");
      const minutes = Number(durationMinutes);
      if (!Number.isFinite(minutes) || minutes < 1) {
        throw new Error("Duration minutes must be at least 1.");
      }
      if (!editingProgramId && programImageFiles.length === 0 && existingProgramImages.length === 0) {
        throw new Error("Program image is required.");
      }
      if (normalizedWorkoutDays.length === 0) {
        throw new Error("Select at least one workout day.");
      }
      const emptyDay = normalizedWorkoutDays.find((day) => day.exerciseIds.length === 0);
      if (emptyDay) {
        throw new Error(`${getDayLabel(emptyDay.dayIndex)} must include at least one exercise.`);
      }

      const exerciseIds = [
        ...new Set(normalizedWorkoutDays.flatMap((day) => day.exerciseIds)),
      ];

      const payload = new FormData();
      payload.append("programName", programName.trim());
      payload.append("programDuration", `${minutes} Minutes`);
      payload.append("durationMinutes", String(minutes));
      payload.append("programLevel", programLevel);
      payload.append("userType", "premium_user");
      payload.append("assignedUser", userId);
      payload.append("programDescription", programDescription.trim());
      payload.append("mobilityType", mobilityType.trim());
      payload.append("exerciseIds", JSON.stringify(exerciseIds));
      payload.append("workoutDays", JSON.stringify(normalizedWorkoutDays));
      payload.append("status", programStatus);

      if (programImageFiles.length > 0) {
        for (const file of programImageFiles) {
          payload.append("programImages", file);
        }
      } else if (editingProgramId) {
        payload.append("programImages", JSON.stringify(existingProgramImages));
      }

      if (programThumbnailFiles.length > 0) {
        for (const file of programThumbnailFiles) {
          payload.append("programThumbnails", file);
        }
      } else if (editingProgramId) {
        payload.append("programThumbnails", JSON.stringify(existingProgramThumbnails));
      }

      if (editingProgramId) {
        return updateProgram(editingProgramId, payload);
      }
      return createProgram(payload);
    },
    onSuccess: () => {
      toast.success(editingProgramId ? "Workout plan updated." : "Workout plan created.");
      resetWorkoutForm();
      queryClient.invalidateQueries({ queryKey: ["admin-premium-user", userId] });
      queryClient.invalidateQueries({ queryKey: ["admin-premium-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-programs"] });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const saveNutritionMutation = useMutation({
    mutationFn: async () => {
      if (!nutritionTitle.trim()) throw new Error("Nutrition plan title is required.");
      const normalizedDays = nutritionDays
        .map((day) => ({
          dayIndex: day.dayIndex,
          label: getDayLabel(day.dayIndex),
          meals: day.meals
            .filter((meal) => meal.recipe)
            .map((meal, index) => ({
              recipe: meal.recipe,
              mealType: meal.mealType || "meal",
              order: meal.order || index + 1,
            })),
        }))
        .filter((day) => day.meals.length > 0);

      if (normalizedDays.length === 0) throw new Error("Add at least one meal to a day.");

      const payload = {
        title: nutritionTitle.trim(),
        description: nutritionDescription.trim(),
        assignedUser: userId,
        status: "published",
        nutritionDays: normalizedDays,
      };

      if (editingNutritionId) {
        return updateNutritionPlan(editingNutritionId, payload);
      }
      return createNutritionPlan(payload);
    },
    onSuccess: () => {
      toast.success(editingNutritionId ? "Nutrition plan updated." : "Nutrition plan created.");
      resetNutritionForm();
      queryClient.invalidateQueries({ queryKey: ["admin-premium-user", userId] });
      queryClient.invalidateQueries({ queryKey: ["admin-premium-users"] });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const currentNutritionDay = nutritionDays.find((day) => day.dayIndex === selectedNutritionDay);

  if (detailQuery.isLoading) {
    return (
      <div className="space-y-5">
        <PageTitle title="Premium User" breadcrumb="Dashboard  >  Premium Users  >  Detail" />
        <TableSkeleton rows={8} />
      </div>
    );
  }

  if (detailQuery.isError || !detail) {
    return (
      <div className="space-y-5">
        <PageTitle title="Premium User" breadcrumb="Dashboard  >  Premium Users  >  Detail" />
        <EmptyState
          title="Unable to load premium user"
          description={getErrorMessage(detailQuery.error) || "User not found."}
        />
        <Button type="button" variant="outline" onClick={() => router.push("/premium-users")}>
          <ArrowLeft className="mr-2 size-4" />
          Back to Premium Users
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PageTitle
          title={detail.user.name || "Premium User"}
          breadcrumb="Dashboard  >  Premium Users  >  Detail"
        />
        <Button type="button" variant="outline" onClick={() => router.push("/premium-users")}>
          <ArrowLeft className="mr-2 size-4" />
          Back
        </Button>
      </div>

      <Card className="overflow-hidden border-[#80b8df42]">
        <CardContent className="grid grid-cols-1 gap-3 p-4 md:grid-cols-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-300">Email</p>
            <p className="text-sm text-white">{detail.user.email}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-300">Phone</p>
            <p className="text-sm text-white">{detail.user.phone || "—"}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-300">Mobility</p>
            <p className="text-sm text-white">{detail.user.mobilityType || "—"}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-300">Subscription</p>
            <p className="text-sm text-white">{detail.user.subscription || "Premium"}</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <button
          type="button"
          onClick={() => setActiveTab("workout")}
          className={cn(
            "h-11 rounded-md border text-sm font-medium transition-colors",
            activeTab === "workout"
              ? "border-[#8ecaf2] bg-[#72B4E6] text-[#112f52]"
              : "border-white/25 bg-white/95 text-[#4b5a78]"
          )}
        >
          Workout Plan
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("nutrition")}
          className={cn(
            "h-11 rounded-md border text-sm font-medium transition-colors",
            activeTab === "nutrition"
              ? "border-[#8ecaf2] bg-[#72B4E6] text-[#112f52]"
              : "border-white/25 bg-white/95 text-[#4b5a78]"
          )}
        >
          Nutrition Plan
        </button>
      </div>

      {activeTab === "workout" ? (
        <div className="space-y-4">
          <Card className="overflow-hidden border-[#80b8df42]">
            <CardContent className="space-y-3 p-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-lg font-semibold text-white">Assigned workout plans</h3>
                <Button type="button" variant="outline" onClick={resetWorkoutForm}>
                  New plan
                </Button>
              </div>
              {detail.workoutPlans.length === 0 ? (
                <p className="text-sm text-slate-300">No workout plan assigned yet.</p>
              ) : (
                detail.workoutPlans.map((plan) => (
                  <div
                    key={plan.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-[#7cb6df55] bg-[#1b3457]/35 px-3 py-2"
                  >
                    <div>
                      <p className="font-medium text-white">{plan.programName}</p>
                      <p className="text-xs text-slate-300">
                        {plan.programLevel} · {plan.dayCount} days · {plan.status}
                      </p>
                    </div>
                    <Button
                      type="button"
                      onClick={() => loadProgram(plan.id).catch((e) => toast.error(getErrorMessage(e)))}
                    >
                      Edit
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-[#80b8df42]">
            <CardContent className="space-y-4 p-4">
              <h3 className="text-lg font-semibold text-white">
                {editingProgramId ? "Edit workout plan" : "Create workout plan"}
              </h3>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-xs">Program Name</Label>
                  <input
                    className={fieldClass}
                    value={programName}
                    onChange={(e) => setProgramName(e.target.value)}
                    placeholder="Strength Training"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Program Duration (minutes)</Label>
                  <input
                    type="number"
                    min={1}
                    className={fieldClass}
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Program Level</Label>
                  <Select
                    value={programLevel}
                    className="h-10"
                    onChange={(e) => setProgramLevel(e.target.value)}
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Status</Label>
                  <Select
                    value={programStatus}
                    className="h-10"
                    onChange={(e) => setProgramStatus(e.target.value)}
                  >
                    <option value="published">Published</option>
                    <option value="draft">Draft</option>
                    <option value="archived">Archived</option>
                  </Select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label className="text-xs">Mobility Type</Label>
                  <input
                    className={fieldClass}
                    value={mobilityType}
                    onChange={(e) => setMobilityType(e.target.value)}
                    placeholder="e.g. wheelchair"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label className="text-xs">Program Description</Label>
                  <Textarea
                    className="min-h-[92px]"
                    value={programDescription}
                    onChange={(e) => setProgramDescription(e.target.value)}
                    placeholder="Type..."
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label className="text-xs">Upload Program Image</Label>
                  {displayedProgramImages.length > 0 ? (
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      {displayedProgramImages.map((imageUrl, index) => (
                        <div key={`${imageUrl}-${index}`} className="relative inline-flex">
                          <img
                            src={imageUrl}
                            alt="Program preview"
                            className="size-16 rounded border border-white/15 object-cover"
                          />
                          <button
                            type="button"
                            className="absolute -right-2 -top-2 inline-flex size-5 items-center justify-center rounded-full border border-white/20 bg-[#ff2f5f] text-white transition-colors hover:bg-[#ff4672]"
                            onClick={() => removeProgramImageAt(index)}
                            aria-label="Remove program image"
                          >
                            <X className="size-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : null}
                  <input
                    id="premium-program-image-upload"
                    type="file"
                    className="hidden"
                    accept="image/*"
                    multiple
                    onChange={(event) => {
                      const files = Array.from(event.target.files || []);
                      setProgramImageFiles(files);
                      if (files.length > 0) setExistingProgramImages([]);
                    }}
                  />
                  <label htmlFor="premium-program-image-upload" className={uploadLabelClass}>
                    <Upload className="size-3.5" />
                    Upload Program Image
                  </label>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label className="text-xs">Upload Program Thumbnail</Label>
                  {displayedProgramThumbnails.length > 0 ? (
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      {displayedProgramThumbnails.map((imageUrl, index) => (
                        <div key={`${imageUrl}-${index}`} className="relative inline-flex">
                          <img
                            src={imageUrl}
                            alt="Program thumbnail preview"
                            className="h-16 w-24 rounded border border-white/15 object-cover"
                          />
                          <button
                            type="button"
                            className="absolute -right-2 -top-2 inline-flex size-5 items-center justify-center rounded-full border border-white/20 bg-[#ff2f5f] text-white transition-colors hover:bg-[#ff4672]"
                            onClick={() => removeProgramThumbnailAt(index)}
                            aria-label="Remove program thumbnail"
                          >
                            <X className="size-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : null}
                  <input
                    id="premium-program-thumbnail-upload"
                    type="file"
                    className="hidden"
                    accept="image/*"
                    multiple
                    onChange={(event) => {
                      const files = Array.from(event.target.files || []);
                      setProgramThumbnailFiles(files);
                      if (files.length > 0) setExistingProgramThumbnails([]);
                    }}
                  />
                  <label htmlFor="premium-program-thumbnail-upload" className={uploadLabelClass}>
                    <Upload className="size-3.5" />
                    Upload Program Thumbnail
                  </label>
                </div>

                <div className="space-y-3 md:col-span-2">
                  <Label className="text-xs">Workout Day Planner</Label>
                  <div className="rounded-lg border border-[#7cb6df55] bg-[#1b3457]/35 p-3">
                    <p className="text-xs text-slate-200">
                      Choose workout days (Monday = 1 to Sunday = 7)
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {WEEKDAY_OPTIONS.map((day) => {
                        const isSelected = normalizedWorkoutDays.some(
                          (item) => item.dayIndex === day.dayIndex
                        );
                        const isActive = isSelected && activePlannerDay === day.dayIndex;

                        return (
                          <div key={day.dayIndex} className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              className={cn(
                                "inline-flex h-8 items-center justify-center rounded-md border px-3 text-xs font-semibold transition-colors",
                                isActive
                                  ? "border-[#9fd8ff] bg-[#5d97c4] text-white"
                                  : isSelected
                                    ? "border-[#7cb6df99] bg-[#1f4268] text-slate-100 hover:bg-[#285176]"
                                    : "border-[#7cb6df55] bg-[#10253f] text-slate-300 hover:bg-[#163354]"
                              )}
                              onClick={() => selectWorkoutPlannerDay(day.dayIndex)}
                            >
                              {day.label}
                            </button>
                            {isSelected ? (
                              <button
                                type="button"
                                className="inline-flex size-5 items-center justify-center rounded-full border border-[#7cb6df66] bg-[#132f4f] text-slate-300 transition-colors hover:bg-[#20486e] hover:text-white"
                                onClick={() => removeWorkoutPlannerDay(day.dayIndex)}
                                aria-label={`Remove ${day.label}`}
                              >
                                <X className="size-3" />
                              </button>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label className="text-xs">
                    Exercises for {getDayLabel(activePlannerDay)}
                  </Label>
                  <input
                    className={fieldClass}
                    value={exerciseSearch}
                    onChange={(e) => setExerciseSearch(e.target.value)}
                    placeholder="Search exercises..."
                  />
                  <div className="max-h-64 space-y-2 overflow-y-auto rounded-lg border border-[#7cb6df55] bg-[#1b3457]/35 p-3">
                    {exercises.length === 0 ? (
                      <p className="text-xs text-slate-300">No exercises found.</p>
                    ) : (
                      exercises.map((exercise) => {
                        const checked =
                          activeWorkoutDay?.exerciseIds.includes(exercise.id) || false;
                        return (
                          <label
                            key={exercise.id}
                            className="flex items-center gap-2 rounded-md border border-transparent px-2 py-1.5 text-sm text-slate-100 hover:border-[#7cb6df55] hover:bg-[#163354]/60"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(event) =>
                                toggleExerciseOnActiveDay(exercise.id, event.target.checked)
                              }
                            />
                            <span>{exercise.exerciseName}</span>
                          </label>
                        );
                      })
                    )}
                  </div>
                  <p className="text-xs text-slate-300">
                    Selected on {getDayLabel(activePlannerDay)}:{" "}
                    {activeWorkoutDay?.exerciseIds.length || 0} exercise(s)
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetWorkoutForm}
                  disabled={saveWorkoutMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  disabled={saveWorkoutMutation.isPending}
                  onClick={() => saveWorkoutMutation.mutate()}
                >
                  {saveWorkoutMutation.isPending
                    ? "Saving..."
                    : editingProgramId
                      ? "Update workout plan"
                      : "Save workout plan"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="space-y-4">
          <Card className="overflow-hidden border-[#80b8df42]">
            <CardContent className="space-y-3 p-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-lg font-semibold text-white">Assigned nutrition plans</h3>
                <Button type="button" variant="outline" onClick={resetNutritionForm}>
                  New plan
                </Button>
              </div>
              {detail.nutritionPlans.length === 0 ? (
                <p className="text-sm text-slate-300">No nutrition plan assigned yet.</p>
              ) : (
                detail.nutritionPlans.map((plan) => (
                  <div
                    key={plan.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-[#7cb6df55] bg-[#1b3457]/35 px-3 py-2"
                  >
                    <div>
                      <p className="font-medium text-white">{plan.title}</p>
                      <p className="text-xs text-slate-300">
                        {plan.dayCount} days · {plan.status}
                      </p>
                    </div>
                    <Button
                      type="button"
                      onClick={() =>
                        loadNutritionPlan(plan.id).catch((e) => toast.error(getErrorMessage(e)))
                      }
                    >
                      Edit
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-[#80b8df42]">
            <CardContent className="space-y-4 p-4">
              <h3 className="text-lg font-semibold text-white">
                {editingNutritionId ? "Edit nutrition plan" : "Create nutrition plan"}
              </h3>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <Label className="text-xs">Plan Title</Label>
                  <input
                    className={fieldClass}
                    value={nutritionTitle}
                    onChange={(e) => setNutritionTitle(e.target.value)}
                    placeholder="Weekly meal plan"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label className="text-xs">Description</Label>
                  <Textarea
                    className="min-h-[92px]"
                    value={nutritionDescription}
                    onChange={(e) => setNutritionDescription(e.target.value)}
                    placeholder="Type..."
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-xs">Nutrition Day Planner</Label>
                <div className="rounded-lg border border-[#7cb6df55] bg-[#1b3457]/35 p-3">
                  <p className="text-xs text-slate-200">Choose a day, then add recipes as meals</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {WEEKDAY_OPTIONS.map((day) => {
                      const mealCount =
                        nutritionDays.find((item) => item.dayIndex === day.dayIndex)?.meals
                          .length || 0;
                      const isActive = selectedNutritionDay === day.dayIndex;
                      return (
                        <button
                          key={day.dayIndex}
                          type="button"
                          className={cn(
                            "inline-flex h-8 items-center justify-center rounded-md border px-3 text-xs font-semibold transition-colors",
                            isActive
                              ? "border-[#9fd8ff] bg-[#5d97c4] text-white"
                              : mealCount > 0
                                ? "border-[#7cb6df99] bg-[#1f4268] text-slate-100 hover:bg-[#285176]"
                                : "border-[#7cb6df55] bg-[#10253f] text-slate-300 hover:bg-[#163354]"
                          )}
                          onClick={() => setSelectedNutritionDay(day.dayIndex)}
                        >
                          {day.label}
                          {mealCount > 0 ? ` (${mealCount})` : ""}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">
                  Add recipe to {getDayLabel(selectedNutritionDay)}
                </Label>
                <input
                  className={fieldClass}
                  value={recipeSearch}
                  onChange={(e) => setRecipeSearch(e.target.value)}
                  placeholder="Search recipes..."
                />
                <select
                  className={fieldClass}
                  defaultValue=""
                  onChange={(event) => {
                    const recipeId = event.target.value;
                    if (!recipeId) return;
                    const recipe = recipes.find((item) => item.id === recipeId);
                    setNutritionDays((prev) =>
                      prev.map((day) => {
                        if (day.dayIndex !== selectedNutritionDay) return day;
                        return {
                          ...day,
                          meals: [
                            ...day.meals,
                            {
                              recipe: recipeId,
                              mealType: recipe?.recipeType || "meal",
                              order: day.meals.length + 1,
                            },
                          ],
                        };
                      })
                    );
                    event.target.value = "";
                  }}
                >
                  <option value="">Select a recipe…</option>
                  {recipes.map((recipe) => (
                    <option key={recipe.id} value={recipe.id}>
                      {recipe.recipeName} ({recipe.recipeType})
                    </option>
                  ))}
                </select>

                <div className="space-y-2 rounded-lg border border-[#7cb6df55] bg-[#1b3457]/35 p-3">
                  {(currentNutritionDay?.meals || []).length === 0 ? (
                    <p className="text-xs text-slate-300">No meals added for this day yet.</p>
                  ) : (
                    (currentNutritionDay?.meals || []).map((meal, index) => {
                      const recipe = recipes.find((item) => item.id === meal.recipe);
                      return (
                        <div
                          key={`${meal.recipe}-${index}`}
                          className="flex items-center justify-between gap-3 rounded-md border border-[#7cb6df55] bg-[#132f4f] px-3 py-2 text-sm text-white"
                        >
                          <span>
                            {recipe?.recipeName || meal.recipe} · {meal.mealType}
                          </span>
                          <button
                            type="button"
                            className="inline-flex size-7 items-center justify-center rounded-full border border-[#7cb6df66] text-slate-200 hover:bg-[#20486e]"
                            onClick={() =>
                              setNutritionDays((prev) =>
                                prev.map((day) =>
                                  day.dayIndex === selectedNutritionDay
                                    ? {
                                        ...day,
                                        meals: day.meals.filter(
                                          (_, mealIndex) => mealIndex !== index
                                        ),
                                      }
                                    : day
                                )
                              )
                            }
                            aria-label="Remove meal"
                          >
                            <X className="size-3.5" />
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetNutritionForm}
                  disabled={saveNutritionMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  disabled={saveNutritionMutation.isPending}
                  onClick={() => saveNutritionMutation.mutate()}
                >
                  {saveNutritionMutation.isPending
                    ? "Saving..."
                    : editingNutritionId
                      ? "Update nutrition plan"
                      : "Save nutrition plan"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
