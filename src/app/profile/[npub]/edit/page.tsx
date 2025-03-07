import EditProfile from "@/components/EditProfile";

export default async function Page({
  params,
}: {
  params: Promise<{ npub: string }>;
}) {
  const { npub } = await params;

  if (!npub || npub.length !== 66) {
    return <div>Invalid npub</div>;
  }
  return (
    <div className="app">
      <div className="flex flex-col gap-4">
        <h1 className="text-h1">Edit profile</h1>
        <EditProfile npub={npub} />
      </div>
    </div>
  );
}
