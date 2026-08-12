import PlannerClient from "./PlannerClient";

// Auth is already gated by the (main) layout - this route just renders
// the client UI, which fetches its own data from /api/outfit-plans.
export default function PlannerPage() {
  return <PlannerClient />;
}
