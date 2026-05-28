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
    ? "—"
    : !user
      ? mr.cloudAccountSignedOut
      : user.isAnonymous
        ? mr.cloudAccountAnonymous
        : (user.email ?? user.uid);
  const configuredLabel = configured ? "होय" : "नाही";

  const lastSyncLabel = lastSyncAt
    ? new Date(lastSyncAt).toLocaleString("mr-IN")
    : mr.cloudLastSyncNever;

  return (
    <section className="mx-auto mb-4 w-full max-w-5xl rounded-xl border border-parchment-dark bg-white/70 p-4 text-left shadow-sm">
      <h3 className="font-devanagari text-sm font-semibold text-maroon">
        {mr.cloudPanelTitle}
      </h3>

      <div className="mt-3 grid gap-3 text-xs text-ink/70 md:grid-cols-3">
        <p>
          <span className="font-medium text-ink/90">{mr.cloudConfigured}: </span>
          {configuredLabel}
        </p>
        <p>
          <span className="font-medium text-ink/90">{mr.cloudAccountLabel}: </span>
          {accountLabel}
        </p>
        <p>
          <span className="font-medium text-ink/90">{mr.cloudLastSyncLabel}: </span>
          {lastSyncLabel}
        </p>
      </div>

      <p className="font-devanagari mt-2 text-xs text-ink/65">
        <span className="font-medium text-ink/85">{mr.cloudStatusLabel}: </span>
        {status}
      </p>

      {!configured && (
        <p className="font-devanagari mt-2 text-xs text-amber-900/80">
          {mr.cloudBuildMissingEnv}
        </p>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
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
