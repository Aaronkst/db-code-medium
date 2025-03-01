import { AppView } from "./view";

export default async function Main({
  params,
}: {
  params: Promise<{ id: string[] }>;
}) {
  const id = (await params).id;

  // fetch nodes with the given id for pro users.

  return <AppView />;
}
