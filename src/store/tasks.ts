import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

// Active workflow progress — what the citizen has actually started.
// `completedSteps` lets the workflow viewer track per-step completion;
// `currentStep` remains as the legacy linear pointer so the dashboard's
// "advance" button keeps working.

export type ActiveTask = {
  id: string;
  workflowId: string;
  title: string;
  progress: number; // 0-100
  currentStep: number;
  totalSteps: number;
  startedAt: string;
  /** Ordinal step numbers that the user has marked complete. */
  completedSteps?: number[];
};

type TasksState = {
  tasks: ActiveTask[];
  startTask: (t: ActiveTask) => void;
  advance: (id: string) => void;
  toggleStep: (taskId: string, stepOrder: number) => void;
  remove: (id: string) => void;
};

function recomputeProgress(t: ActiveTask): ActiveTask {
  const done = (t.completedSteps ?? []).length;
  const total = t.totalSteps || 1;
  return {
    ...t,
    progress: Math.min(100, Math.round((done / total) * 100)),
    currentStep: Math.min(total, done + 1),
  };
}

export const useTasks = create<TasksState>()(
  persist(
    (set) => ({
      tasks: [],
      startTask: (t) =>
        set((s) => ({
          tasks: [
            { ...t, completedSteps: t.completedSteps ?? [] },
            ...s.tasks.filter((x) => x.id !== t.id),
          ],
        })),
      advance: (id) =>
        set((s) => ({
          tasks: s.tasks.map((t) => {
            if (t.id !== id) return t;
            const done = new Set(t.completedSteps ?? []);
            // Find the lowest pending step and mark it done.
            for (let i = 1; i <= t.totalSteps; i += 1) {
              if (!done.has(i)) {
                done.add(i);
                break;
              }
            }
            return recomputeProgress({
              ...t,
              completedSteps: Array.from(done).sort((a, b) => a - b),
            });
          }),
        })),
      toggleStep: (taskId, stepOrder) =>
        set((s) => ({
          tasks: s.tasks.map((t) => {
            if (t.id !== taskId) return t;
            const done = new Set(t.completedSteps ?? []);
            if (done.has(stepOrder)) done.delete(stepOrder);
            else done.add(stepOrder);
            return recomputeProgress({
              ...t,
              completedSteps: Array.from(done).sort((a, b) => a - b),
            });
          }),
        })),
      remove: (id) => set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),
    }),
    { name: "civis-tasks", storage: createJSONStorage(() => localStorage) },
  ),
);
