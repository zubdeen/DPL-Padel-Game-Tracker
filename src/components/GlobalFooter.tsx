import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { defaultSiteContent, useSiteContent } from "@/lib/site-content";

export function GlobalFooter() {
    const { user } = useAuth();
  const { data: configuredContent } = useSiteContent();
  const content = configuredContent ?? defaultSiteContent;
  return (

    <footer className="mt-8 pt-6 pb-8 border-t border-border/30">
      <div className="flex flex-col items-center gap-3">
        <div className="flex items-center gap-4 text-[11px]">
          {user ? (
            <button
              onClick={() => supabase.auth.signOut()}
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              Sign out
            </button>
          ) : (
            <Link
              href="/auth"
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              Admin sign in
            </Link>
          )}
        </div>
        <p className="text-[9px] text-muted-foreground/60 tracking-wider uppercase">
                    {content.footer.trackerLabel}

        </p>
      </div>
    </footer>
  );
}
