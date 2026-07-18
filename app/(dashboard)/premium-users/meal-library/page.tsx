"use client";

import { ChevronsUpDown, Copy, Plus, Search, SquarePen, Trash2, UserPlus, X } from "lucide-react";
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
  assignNutritionPlanToPremiumUser,
  createNutritionPlan,
  deleteNutritionPlan,
  duplicateAdminNutritionPlan,
  getAdminNutritionPlanById,
  getAdminNutritionPlans,
  getAdminPremiumUsers,
  getAdminRecipes,
  getErrorMessage,
  updateNutritionPlan,
  type NutritionPlan,
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

const MEAL_SLOT_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "meal_1", label: "Meal 1" },
  { value: "snack_1", label: "Snack 1" },
  { value: "meal_2", label: "Meal 2" },
  { value: "snack_2", label: "Snack 2" },
  { value: "meal_3", label: "Meal 3" },
  { value: "snack_3", label: "Snack 3" },
];

type NutritionDayDraft = {
  dayIndex: number;
  meals: Array<{ recipe: string; mealType: string; order: number }>;
};

const emptyDays = (): NutritionDayDraft[] =>
  WEEKDAY_OPTIONS.map((day) => ({ dayIndex: day.dayIndex, meals: [] }));

const getDayLabel = (dayIndex: number) =>
  WEEKDAY_OPTIONS.find((day) => day.dayIndex === dayIndex)?.label || `Day ${dayIndex}`;

const mealSlotLabel = (mealType: string) =>
  MEAL_SLOT_OPTIONS.find((slot) => slot.value === mealType)?.label || mealType;

const fieldClass =
  "h-10 w-full rounded border border-[#7cb6df66] bg-[#1b3457]/80 px-3 text-sm text-slate-100 outline-none ring-0 transition focus:border-[#93ceff99]";

export default function MealProgramLibraryPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [assignOpen, setAssignOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selected, setSelected] = useState<NutritionPlan | null>(null);
  const [assignUserId, setAssignUserId] = useState("");

  // Private meal program builder state
  const [builderOpen, setBuilderOpen] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [planTitle, setPlanTitle] = useState("");
  const [planDescription, setPlanDescription] = useState("");
  const [nutritionDays, setNutritionDays] = useState<NutritionDayDraft[]>(emptyDays());
  const [selectedDay, setSelectedDay] = useState(1);
  const [selectedMealSlot, setSelectedMealSlot] = useState("meal_1");
  const [recipeSearch, setRecipeSearch] = useState("");
  const [recipePickerOpen, setRecipePickerOpen] = useState(false);
  const [loadingPlanId, setLoadingPlanId] = useState<string | null>(null);

  const plansQuery = useQuery({
    queryKey: ["premium-meal-library", page, search],
    queryFn: () =>
      getAdminNutritionPlans({
        page,
        limit: PAGE_SIZE,
        search: search || undefined,
        templatesOnly: true,
      }),
  });

  const premiumUsersQuery = useQuery({
    queryKey: ["admin-premium-users-picker-meals"],
    queryFn: () => getAdminPremiumUsers({ page: 1, limit: 100 }),
    enabled: assignOpen,
  });

  const recipesQuery = useQuery({
    queryKey: ["meal-library-recipes-options", recipeSearch],
    queryFn: () =>
      getAdminRecipes({
        page: 1,
        limit: 2000,
        status: "published",
        search: recipeSearch.trim() || undefined,
      }),
    enabled: builderOpen,
  });

  const privateRecipesQuery = useQuery({
    queryKey: ["meal-library-private-recipes"],
    queryFn: () => getAdminRecipes({ page: 1, limit: 100, userType: "premium_user" }),
  });

  const plans = useMemo(() => plansQuery.data?.data || [], [plansQuery.data]);
  const meta = plansQuery.data?.meta;
  const premiumUsers = premiumUsersQuery.data?.data || [];
  const recipes = useMemo(() => recipesQuery.data?.data || [], [recipesQuery.data]);
  const privateRecipes = useMemo(
    () => (privateRecipesQuery.data?.data || []).filter((recipe) => !recipe.assignedUser),
    [privateRecipesQuery.data]
  );

  const resetBuilder = () => {
    setEditingPlanId(null);
    setPlanTitle("");
    setPlanDescription("");
    setNutritionDays(emptyDays());
    setSelectedDay(1);
    setSelectedMealSlot("meal_1");
    setRecipeSearch("");
  };

  const openCreateBuilder = () => {
    resetBuilder();
    setBuilderOpen(true);
  };

  const openEditBuilder = async (planId: string) => {
    setLoadingPlanId(planId);
    try {
      const plan = await getAdminNutritionPlanById(planId);
      setEditingPlanId(plan.id);
      setPlanTitle(plan.title || "");
      setPlanDescription(plan.description || "");
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
      setSelectedDay(1);
      setBuilderOpen(true);
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to load meal program."));
    } finally {
      setLoadingPlanId(null);
    }
  };

  const savePlanMutation = useMutation({
    mutationFn: async () => {
      if (!planTitle.trim()) throw new Error("Meal program title is required.");
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
        title: planTitle.trim(),
        description: planDescription.trim(),
        isTemplate: true,
        status: "published",
        nutritionDays: normalizedDays,
      };

      if (editingPlanId) {
        return updateNutritionPlan(editingPlanId, payload);
      }
      return createNutritionPlan(payload);
    },
    onSuccess: () => {
      toast.success(editingPlanId ? "Private meal program updated." : "Private meal program created.");
      setBuilderOpen(false);
      resetBuilder();
      queryClient.invalidateQueries({ queryKey: ["premium-meal-library"] });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const assignMutation = useMutation({
    mutationFn: () =>
      assignNutritionPlanToPremiumUser(selected!.id, { userId: assignUserId }),
    onSuccess: () => {
      toast.success("Meal program assigned to premium user");
      setAssignOpen(false);
      setAssignUserId("");
      setSelected(null);
      queryClient.invalidateQueries({ queryKey: ["admin-premium-users"] });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const duplicateMutation = useMutation({
    mutationFn: (planId: string) => duplicateAdminNutritionPlan(planId, { asTemplate: true }),
    onSuccess: () => {
      toast.success("Meal program duplicated");
      queryClient.invalidateQueries({ queryKey: ["premium-meal-library"] });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const deleteMutation = useMutation({
    mutationFn: (planId: string) => deleteNutritionPlan(planId),
    onSuccess: () => {
      toast.success("Meal program deleted");
      setDeleteOpen(false);
      setSelected(null);
      queryClient.invalidateQueries({ queryKey: ["premium-meal-library"] });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const currentDay = nutritionDays.find((day) => day.dayIndex === selectedDay);

  const addRecipeToSelectedDay = (recipeId: string) => {
    if (!recipeId) return;
    setNutritionDays((prev) =>
      prev.map((day) => {
        if (day.dayIndex !== selectedDay) return day;
        const nextOrder =
          MEAL_SLOT_OPTIONS.findIndex((slot) => slot.value === selectedMealSlot) + 1 ||
          day.meals.length + 1;
        return {
          ...day,
          meals: [
            ...day.meals.filter((meal) => meal.mealType !== selectedMealSlot),
            {
              recipe: recipeId,
              mealType: selectedMealSlot,
              order: nextOrder > 0 ? nextOrder : day.meals.length + 1,
            },
          ].sort((a, b) => a.order - b.order),
        };
      })
    );
  };

  return (
    <div className="space-y-5">
      <PageTitle
        title="Meal Program Library"
        breadcrumb="Dashboard  >  Premium Users  >  Meal Program Library"
        action={
          <Button className="gap-2" onClick={openCreateBuilder}>
            <Plus className="size-4" />
            Create Private Meal Program
          </Button>
        }
      />
      <p className="text-sm text-slate-300">
        Private meal programs, visible only to you as the administrator. Structured Monday–Sunday with Meal 1 /
        Snack 1 / Meal 2 / Snack 2 / Meal 3 / Snack 3 slots. Regular users never see these — assign them to premium
        users when ready.
      </p>

      {builderOpen ? (
        <Card className="overflow-hidden border-[#80b8df42]">
          <CardContent className="space-y-4 p-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-white">
                {editingPlanId ? "Edit private meal program" : "Create private meal program"}
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
              <div className="space-y-2 md:col-span-2">
                <Label className="text-xs">Program Title</Label>
                <input
                  className={fieldClass}
                  value={planTitle}
                  onChange={(e) => setPlanTitle(e.target.value)}
                  placeholder="e.g. High Protein Weekly Plan"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label className="text-xs">Description</Label>
                <Textarea
                  className="min-h-[80px]"
                  value={planDescription}
                  onChange={(e) => setPlanDescription(e.target.value)}
                  placeholder="Type..."
                />
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-xs">Meal Day Planner</Label>
              <div className="rounded-lg border border-[#7cb6df55] bg-[#1b3457]/35 p-3">
                <p className="text-xs text-slate-200">Choose a day, then add recipes as meals</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {WEEKDAY_OPTIONS.map((day) => {
                    const mealCount =
                      nutritionDays.find((item) => item.dayIndex === day.dayIndex)?.meals.length || 0;
                    const isActive = selectedDay === day.dayIndex;
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
                        onClick={() => setSelectedDay(day.dayIndex)}
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
              <Label className="text-xs">Add recipe to {getDayLabel(selectedDay)}</Label>
              <Select value={selectedMealSlot} onChange={(event) => setSelectedMealSlot(event.target.value)}>
                {MEAL_SLOT_OPTIONS.map((slot) => (
                  <option key={slot.value} value={slot.value}>
                    {slot.label}
                  </option>
                ))}
              </Select>
              <Popover open={recipePickerOpen} onOpenChange={setRecipePickerOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="flex h-10 w-full items-center justify-between rounded-md border border-[#7cb6df66] bg-[#1b3457]/80 px-3 text-sm text-slate-300/90 transition-colors hover:bg-[#23456f]/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300/60"
                  >
                    <span>
                      Add {mealSlotLabel(selectedMealSlot)} recipe to {getDayLabel(selectedDay)}
                    </span>
                    <ChevronsUpDown className="size-4 shrink-0 text-slate-400" />
                  </button>
                </PopoverTrigger>
                <PopoverContent>
                  <Command shouldFilter={false}>
                    <CommandInput
                      value={recipeSearch}
                      onValueChange={setRecipeSearch}
                      placeholder="Search recipes…"
                    />
                    <CommandList>
                      {recipesQuery.isLoading ? (
                        <CommandEmpty>Loading recipes…</CommandEmpty>
                      ) : recipesQuery.isError ? (
                        <CommandEmpty className="text-red-300">
                          {getErrorMessage(recipesQuery.error)}
                        </CommandEmpty>
                      ) : recipes.length === 0 ? (
                        <CommandEmpty>
                          {recipeSearch.trim()
                            ? `No recipes match "${recipeSearch.trim()}".`
                            : "No recipes found."}
                        </CommandEmpty>
                      ) : (
                        <CommandGroup>
                          {recipes.map((recipe) => (
                            <CommandItem
                              key={recipe.id}
                              value={recipe.id}
                              onSelect={() => {
                                addRecipeToSelectedDay(recipe.id);
                                setRecipePickerOpen(false);
                                setRecipeSearch("");
                              }}
                            >
                              {recipe.recipeName}
                              <span className="ml-auto pl-3 text-xs capitalize text-slate-400">
                                {recipe.recipeType}
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
                {(currentDay?.meals || []).length === 0 ? (
                  <p className="text-xs text-slate-300">
                    No meals added for this day yet. Use Meal 1 / Snack 1 / Meal 2 / Snack 2 / Meal 3 / Snack 3 slots.
                  </p>
                ) : (
                  (currentDay?.meals || []).map((meal, index) => {
                    const recipe = recipes.find((item) => item.id === meal.recipe);
                    return (
                      <div
                        key={`${meal.recipe}-${index}`}
                        className="flex items-center justify-between gap-3 rounded-md border border-[#7cb6df55] bg-[#132f4f] px-3 py-2 text-sm text-white"
                      >
                        <span>
                          {mealSlotLabel(meal.mealType)} · {recipe?.recipeName || meal.recipe}
                        </span>
                        <button
                          type="button"
                          className="inline-flex size-7 items-center justify-center rounded-full border border-[#7cb6df66] text-slate-200 hover:bg-[#20486e]"
                          onClick={() =>
                            setNutritionDays((prev) =>
                              prev.map((day) =>
                                day.dayIndex === selectedDay
                                  ? {
                                      ...day,
                                      meals: day.meals.filter((_, mealIndex) => mealIndex !== index),
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
                onClick={() => {
                  setBuilderOpen(false);
                  resetBuilder();
                }}
                disabled={savePlanMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={savePlanMutation.isPending}
                onClick={() => savePlanMutation.mutate()}
              >
                {savePlanMutation.isPending
                  ? "Saving..."
                  : editingPlanId
                    ? "Update meal program"
                    : "Save meal program"}
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
          placeholder="Search meal programs"
          className="md:max-w-md"
        />
        <Button type="submit" className="gap-2">
          <Search className="size-4" />
          Search
        </Button>
      </form>

      {plansQuery.isLoading ? (
        <TableSkeleton rows={8} />
      ) : plansQuery.isError ? (
        <EmptyState title="Failed to load meal library" description={getErrorMessage(plansQuery.error)} />
      ) : plans.length === 0 ? (
        <EmptyState
          title="No private meal programs yet"
          description="Use the “Create Private Meal Program” button to build your first admin-only meal program."
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-[#7cb6df33]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Meal Program</TableHead>
                <TableHead>Days</TableHead>
                <TableHead>Meals</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {plans.map((plan) => (
                <TableRow key={plan.id}>
                  <TableCell>
                    <p className="font-medium text-white">{plan.title}</p>
                    <p className="line-clamp-1 text-xs text-slate-400">{plan.description || "—"}</p>
                  </TableCell>
                  <TableCell>{plan.dayCount}</TableCell>
                  <TableCell>{plan.mealCount ?? 0}</TableCell>
                  <TableCell className="capitalize">{plan.status}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void openEditBuilder(plan.id)}
                        disabled={loadingPlanId === plan.id}
                      >
                        <SquarePen className="size-4" />
                        {loadingPlanId === plan.id ? "Loading…" : "Edit"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelected(plan);
                          setAssignOpen(true);
                        }}
                      >
                        <UserPlus className="size-4" />
                        Assign
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => duplicateMutation.mutate(plan.id)}>
                        <Copy className="size-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          setSelected(plan);
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

      <div className="space-y-3 pt-4">
        <h2 className="text-lg font-semibold text-white">Private Premium Recipes</h2>
        <p className="text-sm text-slate-300">
          Premium recipes without an assigned user are private and only visible to you. Create them in Recipes
          Management by choosing user type “Premium user” and leaving the assigned user as “Private”.
        </p>

        {privateRecipesQuery.isLoading ? (
          <TableSkeleton rows={4} />
        ) : privateRecipesQuery.isError ? (
          <EmptyState
            title="Failed to load private recipes"
            description={getErrorMessage(privateRecipesQuery.error)}
          />
        ) : privateRecipes.length === 0 ? (
          <EmptyState
            title="No private premium recipes yet"
            description="Add one from Recipes Management with user type “Premium user” and no assigned user."
          />
        ) : (
          <div className="overflow-hidden rounded-xl border border-[#7cb6df33]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Recipe</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {privateRecipes.map((recipe) => (
                  <TableRow key={recipe.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {recipe.recipeImage ? (
                          <img
                            src={recipe.recipeImage}
                            alt={recipe.recipeName}
                            className="size-9 rounded-full object-cover"
                          />
                        ) : null}
                        <p className="font-medium text-white">{recipe.recipeName}</p>
                      </div>
                    </TableCell>
                    <TableCell className="capitalize">{recipe.recipeType}</TableCell>
                    <TableCell>{recipe.durationMinutes} min</TableCell>
                    <TableCell className="capitalize">{recipe.status}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <Modal open={assignOpen} onClose={() => setAssignOpen(false)} title="Assign meal program">
        <div className="space-y-4">
          <p className="text-sm text-slate-300">
            Assign <strong>{selected?.title}</strong> to a premium user.
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
        title="Delete meal program?"
        description={`This will archive "${selected?.title}". Assigned user copies are not deleted.`}
        confirmText="Delete"
        onConfirm={() => selected && deleteMutation.mutate(selected.id)}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
