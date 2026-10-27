import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { createClient } from "./supabase/server";

/** The signed-in user. Redirects to /login if there isn't one. Deduped per request. */
export const requireUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
});

export const getProfile = cache(async () => {
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  if (error) throw error;
  return data;
});

export const hasBudget = cache(async () => {
  const { supabase } = await requireUser();
  const { count, error } = await supabase.from("budgets").select("id", { count: "exact", head: true });
  if (error) throw error;
  return (count ?? 0) > 0;
});
