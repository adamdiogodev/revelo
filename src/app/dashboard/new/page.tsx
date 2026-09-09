import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import EventWizard from "@/components/EventWizard";

export const dynamic = "force-dynamic";

export default async function NewEventPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return <EventWizard />;
}
