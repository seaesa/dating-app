import type { Metadata } from "next";

import { PublicProfile } from "./public-profile";

export const metadata: Metadata = {
  title: "Hồ sơ",
  description: "Hồ sơ công khai trên Terdin.",
};

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // A server component, so the semantic structure search engines read is real
  // HTML. react-native-web renders only divs below this point.
  return (
    <main className="mx-auto w-full max-w-lg p-6">
      <h1 className="sr-only">Hồ sơ công khai</h1>
      <PublicProfile userId={id} />
    </main>
  );
}
