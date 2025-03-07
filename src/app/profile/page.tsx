import EditProfile from "@/components/EditProfile";
import { NostrProvider } from "@/providers/NostrProvider";

export default async function Page() {
  return (
    <NostrProvider>
      <div className="app">
        <div className="flex flex-col gap-4">
          <h1 className="text-h1">Edit profile</h1>
          <EditProfile />
        </div>
      </div>
    </NostrProvider>
  );
}
