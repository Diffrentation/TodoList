import WorkspaceApp from "@/components/WorkspaceApp";

export const metadata = {
  title: "Workspace",
  description: "Manage your projects, priorities, and tasks in one private workspace.",
  robots: { index: false, follow: false },
};

export default function DashboardPage() {
  return <WorkspaceApp />;
}
