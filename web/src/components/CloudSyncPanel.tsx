import type { User } from "firebase/auth";
import { isGoogleSignedIn } from "../lib/cloudPersistence";
import { mr } from "../locale/mr";

interface CloudSyncPanelProps {
  configured: boolean;
  busy: boolean;
  status: string;
  user: User | null;
  lastSyncAt: string | null;
  onSignIn: () => void;
  onSignOut: () => void;
  onSyncNow: () => void;
}

export function CloudSyncPanel({
  configured,
  busy,
  status,
  user,
  lastSyncAt,
  onSignIn,
  onSignOut,
  onSyncNow,
}: CloudSyncPanelProps) {
  const googleSignedIn = isGoogleSignedIn(user);
  const accountLabel = !configured
    ? "Cloud off"
    : !user
      ? mr.cloudAccountSignedOut
      : user.isAnonymous
        ? mr.cloudAccountAnonymous
        : (user.email ?? user.uid);

  const lastSyncLabel = lastSyncAt
    ? new Date(lastSyncAt).toLocaleString("en-US")
    : mr.cloudLastSyncNever;
  const compactStatus = configured
    ? `${accountLabel} · ${status} · Last sync: ${lastSyncLabel}`
    : `${accountLabel} · ${mr.cloudBuildMissingEnv}`;

  return (
    <section className="mx-auto mb-3 flex w-full max-w-5xl flex-col gap-2 rounded-lg border border-parchment-dark bg-white/60 px-3 py-2 text-left shadow-sm md:flex-row md:items-center md:justify-between">
      <p className="min-w-0 text-xs text-ink/65">
        <span className="font-medium text-ink/85">Cloud: </span>
        {compactStatus}
      </p>

      <div className="flex shrink-0 flex-wrap gap-2">
        {googleSignedIn ? (
          <button
            type="button"
            disabled={busy || !configured}
            onClick={onSignOut}
            className="rounded-full border border-ink/20 bg-white px-3 py-1 text-[11px] text-ink/70 hover:bg-ink/5 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {mr.cloudSignOut}
          </button>
        ) : (
          <button
            type="button"
            disabled={busy || !configured}
            onClick={onSignIn}
            className="rounded-full border border-maroon/30 bg-white px-3 py-1 text-[11px] font-medium text-maroon hover:bg-maroon hover:text-parchment disabled:cursor-not-allowed disabled:opacity-60"
          >
            {mr.cloudSignInGoogle}
          </button>
        )}

        {configured && (
          <button
            type="button"
            disabled={busy}
            onClick={onSyncNow}
            className="rounded-full bg-maroon px-3 py-1 text-[11px] text-parchment hover:bg-maroon-light disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? mr.cloudSyncing : mr.cloudSyncNow}
          </button>
        )}
      </div>
    </section>
  );
}
