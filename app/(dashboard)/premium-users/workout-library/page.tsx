"use client";

import { ChevronsUpDown, Copy, Plus, Search, Trash2, Upload, UserPlus, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { PageTitle } from "@/components/shared/page-title";
import { Pagination } from "@/components/shared/pagination";
import { TableSkeleton } from "@/components/shared/table-skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  assignProgramToPremiumUser,
  createProgram,
  deleteProgram,
  duplicateAdminProgram,
  getAdminExercises,
  getAdminPremiumUsers,
  getAdminProgramById,
  getAdminPrograms,
  getErrorMessage,
  updateProgram,
  type Program,
} from "@/lib/api";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 10;

const WEEKDAY_OPTIONS: Array<{ dayIndex: number; label: string }> = [
  { dayIndex: 1, label: "Monday" },
  { dayIndex: 2, label: "Tuesday" },
  { dayIndex: 3, label: "Wednesday" },
  { dayIndex: 4, label: "Thursday" },
  { dayIndex: 5, label: "Friday" },
  { dayIndex: 6, label: "Saturday" },
  { dayIndex: 7, label: "Sunday" },
];

type WorkoutDayAssignment = { dayIndex: number; exerciseIds: string[] };

const getDayLabel = (dayIndex: number) =>
  WEEKDAY_OPTIONS.find((day) => day.dayIndex === dayIndex)?.label || `Day ${dayIndex}`;

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

const fieldClass =
  "h-10 w-full rounded border border-[#7cb6df66] bg-[#1b3457]/80 px-3 text-sm text-slate-100 outline-none ring-0 transition focus:border-[#93ceff99]";

const uploadLabelClass =
  "flex h-14 cursor-pointer items-center justify-center gap-2 rounded border border-[#7cb6df66] bg-[#1b3457]/50 text-xs text-slate-100 transition hover:bg-[#23456f]/55";

const DEFAULT_DAY_INDICES = [1, 2, 3, 4, 5, 6, 7];

export default function WorkoutProgramLibraryPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [assignOpen, setAssignOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selected, setSelected] = useState<Program | null>(null);
  const [assignUserId, setAssignUserId] = useState("");

  // Builder state
  const [builderOpen, setBuilderOpen] = useState(false);
  const [editingProgramId, setEditingProgramId] = useState<string | null>(null);
  const [loadingProgramId, setLoadingProgramId] = useState<string | null>(null);
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
  const [exercisePickerOpen, setExercisePickerOpen] = useState(false);

  const programImagePreviews = useMemo(
    () => programImageFiles.map((file) => URL.createObjectURL(file)),
    [programImageFiles]
  );
  const programThumbnailPreviews = useMemo(
    () => programThumbnailFiles.map((file) => URL.createObjectURL(file)),
    [programThumbnailFiles]
  );

  const programsQuery = useQuery({
    queryKey: ["premium-workout-library", page, search],
    queryFn: () =>
      getAdminPrograms({
        page,
        limit: PAGE_SIZE,
        search: search || undefined,
        templatesOnly: true,
      }),
  });

  const premiumUsersQuery = useQuery({
    queryKey: ["admin-premium-users-picker"],
    queryFn: () => getAdminPremiumUsers({ page: 1, limit: 100 }),
    enabled: assignOpen,
  });

  const exercisesQuery = useQuery({
    queryKey: ["workout-library-exercises", exerciseSearch],
    queryFn: () =>
      getAdminExercises({
        page: 1,
        limit: 2000,
        status: "published",
        search: exerciseSearch.trim() || undefined,
      }),
    enabled: builderOpen,
  });

  const programs = useMemo(() => programsQuery.data?.data || [], [programsQuery.data]);
  const meta = programsQuery.data?.meta;
  const premiumUsers = premiumUsersQuery.data?.data || [];
  const exercises = useMemo(() => exercisesQuery.data?.data || [], [exercisesQuery.data]);

  const normalizedWorkoutDays = useMemo(() => normalizeWorkoutDays(workoutDays), [workoutDays]);
  const activeWorkoutDay = normalizedWorkoutDays.find((day) => day.dayIndex === activePlannerDay);

  const resetBuilder = () => {
    setEditingProgramId(null);
    setProgramName("");
    setProgramDescription("");
    setDurationMinutes("45");
    setProgramLevel("beginner");
    setMobilityType("");
    setProgramStatus("published");
    setExistingProgramImages([]);
    setExistingProgramThumbnails([]);
    setProgramImageFiles([]);
    setProgramThumbnailFiles([]);
    setWorkoutDays(DEFAULT_DAY_INDICES.map((dayIndex) => ({ dayIndex, exerciseIds: [] })));
    setActivePlannerDay(1);
    setExerciseSearch("");
  };

  const openCreateBuilder = () => {
    resetBuilder();
    setBuilderOpen(true);
  };

  const openEditBuilder = async (programId: string) => {
    setLoadingProgramId(programId);
    try {
      const program = await getAdminProgramById(programId);
      setEditingProgramId(program.id);
      setProgramName(program.programName || "");
      setProgramDescription(program.programDescription || "");
      setDurationMinutes(String(program.durationMinutes || 45));
      setProgramLevel(program.programLevel || "beginner");
      setMobilityType(program.mobilityType || "");
      setProgramStatus(program.status || "published");
      setExistingProgramImages(program.programImages || []);
      setExistingProgramThumbnails(program.programThumbnails || []);
      setProgramImageFiles([]);
      setProgramThumbnailFiles([]);
      const byDay = new Map(
        (program.workoutDays || []).map((day) => [
          day.dayIndex,
          day.exerciseIds || [],
        ])
      );
      setWorkoutDays(
        DEFAULT_DAY_INDICES.map((dayIndex) => ({
          dayIndex,
          exerciseIds: byDay.get(dayIndex) || [],
        }))
      );
      setActivePlannerDay(1);
      setBuilderOpen(true);
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to load workout program."));
    } finally {
      setLoadingProgramId(null);
    }
  };

  const removeWorkoutPlannerDay = (dayIndex: number) => {
    setWorkoutDays((prev) =>
      prev.map((day) => (day.dayIndex === dayIndex ? { ...day, exerciseIds: [] } : day))
    );
  };

  const addExerciseToActiveDay = (exerciseId: string) => {
    setWorkoutDays((prev) =>
      prev.map((day) =>
        day.dayIndex === activePlannerDay
          ? { ...day, exerciseIds: [...new Set([...day.exerciseIds, exerciseId])] }
          : day
      )
    );
  };

  const removeExerciseFromActiveDay = (exerciseId: string) => {
    setWorkoutDays((prev) =>
      prev.map((day) =>
        day.dayIndex === activePlannerDay
          ? { ...day, exerciseIds: day.exerciseIds.filter((id) => id !== exerciseId) }
          : day
      )
    );
  };

  const removeProgramImageAt = (index: number) => {
    if (programImageFiles.length > 0) {
      setProgramImageFiles((prev) => prev.filter((_, i) => i !== index));
    } else {
      setExistingProgramImages((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const removeProgramThumbnailAt = (index: number) => {
    if (programThumbnailFiles.length > 0) {
      setProgramThumbnailFiles((prev) => prev.filter((_, i) => i !== index));
    } else {
      setExistingProgramThumbnails((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const displayedProgramImages =
    programImagePreviews.length > 0 ? programImagePreviews : existingProgramImages;
  const displayedProgramThumbnails =
    programThumbnailPreviews.length > 0 ? programThumbnailPreviews : existingProgramThumbnails;

  const saveProgramMutation = useMutation({
    mutationFn: async () => {
      const minutes = Number(durationMinutes);
      if (!programName.trim()) throw new Error("Program name is required.");
      if (Number.isNaN(minutes) || minutes < 1) throw new Error("Duration must be a positive number.");
      if (!editingProgramId && programImageFiles.length === 0 && existingProgramImages.length === 0) {
        throw new Error("Program image is required.");
      }

      const activeDays = normalizedWorkoutDays.filter((day) => day.exerciseIds.length > 0);
      if (activeDays.length === 0) throw new Error("Add exercises to at least one day.");

      const exerciseIds = [...new Set(activeDays.flatMap((day) => day.exerciseIds))];

      const payload = new FormData();
      payload.append("programName", programName.trim());
      payload.append("programDuration", `${minutes} Minutes`);
      payload.append("durationMinutes", String(minutes));
      payload.append("programLevel", programLevel);
      payload.append("userType", "premium_user");
      payload.append("programDescription", programDescription.trim());
      payload.append("mobilityType", mobilityType.trim());
      payload.append("exerciseIds", JSON.stringify(exerciseIds));
      payload.append("workoutDays", JSON.stringify(activeDays));
      payload.append("status", programStatus);
      payload.append("isTemplate", "true");

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
      toast.success(editingProgramId ? "Workout program updated." : "Workout program created.");
      setBuilderOpen(false);
      resetBuilder();
      queryClient.invalidateQueries({ queryKey: ["premium-workout-library"] });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const assignMutation = useMutation({
    mutationFn: () =>
      assignProgramToPremiumUser(selected!.id, { userId: assignUserId }),
    onSuccess: () => {
      toast.success("Program assigned to premium user");
      setAssignOpen(false);
      setAssignUserId("");
      setSelected(null);
      queryClient.invalidateQueries({ queryKey: ["admin-premium-users"] });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const duplicateMutation = useMutation({
    mutationFn: (programId: string) => duplicateAdminProgram(programId, { asTemplate: true }),
    onSuccess: () => {
      toast.success("Program duplicated");
      queryClient.invalidateQueries({ queryKey: ["premium-workout-library"] });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const deleteMutation = useMutation({
    mutationFn: (programId: string) => deleteProgram(programId),
    onSuccess: () => {
      toast.success("Program deleted");
      setDeleteOpen(false);
      setSelected(null);
      queryClient.invalidateQueries({ queryKey: ["premium-workout-library"] });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  return (
    <div className="space-y-5">
      <PageTitle
        title="Workout Program Library"
        breadcrumb="Dashboard  >  Premium Users  >  Workout Program Library"
        action={
          <Button className="gap-2" onClick={openCreateBuilder}>
            <Plus className="size-4" />
            Create Workout Program
          </Button>
        }
      />
      <p className="text-sm text-slate-300">
        Private workout program templates. Assign to a premium user with one click — programs here never appear in
        Program Management.
      </p>

      {builderOpen ? (
        <Card className="overflow-hidden border-[#80b8df42]">
          <CardContent className="space-y-4 p-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-white">
                {editingProgramId ? "Edit workout program" : "Create workout program"}
              </h3>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setBuilderOpen(false);
                  resetBuilder();
                }}
              >
                Close
              </Button>
            </div>

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
                <Select value={programLevel} className="h-10" onChange={(e) => setProgramLevel(e.target.value)}>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Status</Label>
                <Select value={programStatus} className="h-10" onChange={(e) => setProgramStatus(e.target.value)}>
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
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
                  className="min-h-[80px]"
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
                          className="absolute -right-2 -top-2 inline-flex size-5 items-center justify-center rounded-full border border-white/20 bg-[#ff2f5f] text-white"
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
                  id="library-program-image-upload"
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
                <label htmlFor="library-program-image-upload" className={uploadLabelClass}>
                  <Upload className="size-3.5" />
                  Upload Program Image
                </label>
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-xs">Workout Day Planner</Label>
              <div className="rounded-lg border border-[#7cb6df55] bg-[#1b3457]/35 p-3">
                <p className="text-xs text-slate-200">Choose a day, then add exercises</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {WEEKDAY_OPTIONS.map((day) => {
                    const exerciseCount =
                      workoutDays.find((item) => item.dayIndex === day.dayIndex)?.exerciseIds.length || 0;
                    const isActive = activePlannerDay === day.dayIndex;
                    return (
                      <div key={day.dayIndex} className="flex items-center gap-1">
                        <button
                          type="button"
                          className={cn(
                            "inline-flex h-8 items-center justify-center rounded-md border px-3 text-xs font-semibold transition-colors",
                            isActive
                              ? "border-[#9fd8ff] bg-[#5d97c4] text-white"
                              : exerciseCount > 0
                                ? "border-[#7cb6df99] bg-[#1f4268] text-slate-100 hover:bg-[#285176]"
                                : "border-[#7cb6df55] bg-[#10253f] text-slate-300 hover:bg-[#163354]"
                          )}
                          onClick={() => setActivePlannerDay(day.dayIndex)}
                        >
                          {day.label.slice(0, 3)}{exerciseCount > 0 ? ` (${exerciseCount})` : ""}
                        </button>
                        {exerciseCount > 0 && (
                          <button
                            type="button"
                            className="inline-flex size-5 items-center justify-center rounded-full border border-[#ff5577]/60 bg-[#ff2f5f]/20 text-[#ff7799] hover:bg-[#ff2f5f]/40"
                            onClick={() => removeWorkoutPlannerDay(day.dayIndex)}
                            aria-label={`Clear ${day.label}`}
                          >
                            <X className="size-3" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Add exercises to {getDayLabel(activePlannerDay)}</Label>
              <Popover open={exercisePickerOpen} onOpenChange={setExercisePickerOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="flex h-10 w-full items-center justify-between rounded-md border border-[#7cb6df66] bg-[#1b3457]/80 px-3 text-sm text-slate-300/90 transition-colors hover:bg-[#23456f]/55"
                  >
                    <span>Search and add exercises to {getDayLabel(activePlannerDay)}</span>
                    <ChevronsUpDown className="size-4 shrink-0 text-slate-400" />
                  </button>
                </PopoverTrigger>
                <PopoverContent>
                  <Command shouldFilter={false}>
                    <CommandInput
                      value={exerciseSearch}
                      onValueChange={setExerciseSearch}
                      placeholder="Search exercises…"
                    />
                    <CommandList>
                      {exercisesQuery.isLoading ? (
                        <CommandEmpty>Loading exercises…</CommandEmpty>
                      ) : exercisesQuery.isError ? (
                        <CommandEmpty className="text-red-300">
                          {getErrorMessage(exercisesQuery.error)}
                        </CommandEmpty>
                      ) : exercises.length === 0 ? (
                        <CommandEmpty>
                          {exerciseSearch.trim()
                            ? `No exercises match "${exerciseSearch.trim()}".`
                            : "No exercises found."}
                        </CommandEmpty>
                      ) : (
                        <CommandGroup>
                          {exercises.map((exercise) => (
                            <CommandItem
                              key={exercise.id}
                              value={exercise.id}
                              onSelect={() => {
                                addExerciseToActiveDay(exercise.id);
                                setExercisePickerOpen(false);
                                setExerciseSearch("");
                              }}
                            >
                              {exercise.exerciseName}
                              <span className="ml-auto pl-3 text-xs capitalize text-slate-400">
                                {exercise.userType === "premium_user" ? "premium" : "general"}
                              </span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      )}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>

              <div className="space-y-2 rounded-lg border border-[#7cb6df55] bg-[#1b3457]/35 p-3">
                {(activeWorkoutDay?.exerciseIds || []).length === 0 ? (
                  <p className="text-xs text-slate-300">No exercises added for {getDayLabel(activePlannerDay)} yet.</p>
                ) : (
                  (activeWorkoutDay?.exerciseIds || []).map((exerciseId) => {
                    const exercise = exercises.find((ex) => ex.id === exerciseId);
                    return (
                      <div
                        key={exerciseId}
                        className="flex items-center justify-between gap-3 rounded-md border border-[#7cb6df55] bg-[#132f4f] px-3 py-2 text-sm text-white"
                      >
                        <span>{exercise?.exerciseName || exerciseId}</span>
                        <button
                          type="button"
                          className="inline-flex size-7 items-center justify-center rounded-full border border-[#7cb6df66] text-slate-200 hover:bg-[#20486e]"
                          onClick={() => removeExerciseFromActiveDay(exerciseId)}
                          aria-label="Remove exercise"
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
                onClick={() => {
                  setBuilderOpen(false);
                  resetBuilder();
                }}
                disabled={saveProgramMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={saveProgramMutation.isPending}
                onClick={() => saveProgramMutation.mutate()}
              >
                {saveProgramMutation.isPending
                  ? "Saving..."
                  : editingProgramId
                    ? "Update workout program"
                    : "Save workout program"}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <form
        className="flex flex-col gap-3 md:flex-row"
        onSubmit={(event) => {
          event.preventDefault();
          setPage(1);
          setSearch(searchInput.trim());
        }}
      >
        <Input
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder="Search workout programs"
          className="md:max-w-md"
        />
        <Button type="submit" className="gap-2">
          <Search className="size-4" />
          Search
        </Button>
      </form>

      {programsQuery.isLoading ? (
        <TableSkeleton rows={8} />
      ) : programsQuery.isError ? (
        <EmptyState title="Failed to load library" description={getErrorMessage(programsQuery.error)} />
      ) : programs.length === 0 ? (
        <EmptyState
          title="No workout programs"
          description="Create a new workout program template using the button above."
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-[#7cb6df33]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Program</TableHead>
                <TableHead>Level</TableHead>
                <TableHead>Days</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {programs.map((program) => (
                <TableRow key={program.id}>
                  <TableCell>
                    <p className="font-medium text-white">{program.programName}</p>
                    <p className="text-xs text-slate-400">
                      {program.durationMinutes} min · {program.totalExercises} exercises
                    </p>
                  </TableCell>
                  <TableCell className="capitalize">{program.programLevel}</TableCell>
                  <TableCell>{program.workoutDays?.length || 0}</TableCell>
                  <TableCell className="capitalize">{program.status}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelected(program);
                          setAssignOpen(true);
                        }}
                      >
                        <UserPlus className="size-4" />
                        Assign
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={loadingProgramId === program.id}
                        onClick={() => openEditBuilder(program.id)}
                      >
                        {loadingProgramId === program.id ? "Loading…" : "Edit"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => duplicateMutation.mutate(program.id)}
                      >
                        <Copy className="size-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          setSelected(program);
                          setDeleteOpen(true);
                        }}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {meta && meta.totalPages > 1 ? (
        <Pagination page={meta.page} totalPages={meta.totalPages} onPageChange={setPage} />
      ) : null}

      <Modal open={assignOpen} onClose={() => setAssignOpen(false)} title="Assign workout program">
        <div className="space-y-4">
          <p className="text-sm text-slate-300">
            Assign <strong>{selected?.programName}</strong> to a premium user.
          </p>
          <Select value={assignUserId} onChange={(event) => setAssignUserId(event.target.value)}>
            <option value="">Select premium user</option>
            {premiumUsers.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name} ({user.email})
              </option>
            ))}
          </Select>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setAssignOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!assignUserId || assignMutation.isPending}
              onClick={() => assignMutation.mutate()}
            >
              {assignMutation.isPending ? "Assigning…" : "Assign"}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Delete workout program?"
        description={`This will permanently delete "${selected?.programName}".`}
        confirmText="Delete"
        onConfirm={() => selected && deleteMutation.mutate(selected.id)}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
