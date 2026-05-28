const CONTACT_LINKS = {
  github: "https://github.com/ajinkyakulkarni26/tablavahi",
  linkedIn: "https://www.linkedin.com/in/ajinkyakulkarni09/",
  email: "kulkarni.ajinkya.09@gmail.com",
};

export function DeveloperContact() {
  return (
    <section className="mx-auto mb-3 w-full max-w-5xl rounded-lg border border-parchment-dark bg-white/55 px-3 py-3 text-left shadow-sm">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-ink/85">
            Developer Contact
          </h2>
          <p className="mt-1 text-xs text-ink/55">
            For composition contributions, feedback, or project issues.
          </p>
        </div>

        <dl className="grid gap-x-4 gap-y-1 text-xs text-ink/65 sm:grid-cols-[auto_1fr]">
          <dt className="font-medium text-ink/80">Name</dt>
          <dd className="font-devanagari text-sm text-ink">
            अजिंक्य अनिल कुळकर्णी
          </dd>

          <dt className="font-medium text-ink/80">GitHub</dt>
          <dd>
            <a
              href={CONTACT_LINKS.github}
              target="_blank"
              rel="noreferrer"
              className="break-all text-maroon hover:underline"
            >
              ajinkyakulkarni26/tablavahi
            </a>
          </dd>

          <dt className="font-medium text-ink/80">LinkedIn</dt>
          <dd>
            <a
              href={CONTACT_LINKS.linkedIn}
              target="_blank"
              rel="noreferrer"
              className="break-all text-maroon hover:underline"
            >
              ajinkyakulkarni09
            </a>
          </dd>

          <dt className="font-medium text-ink/80">Email</dt>
          <dd>
            <a
              href={`mailto:${CONTACT_LINKS.email}`}
              className="break-all text-maroon hover:underline"
            >
              {CONTACT_LINKS.email}
            </a>
          </dd>
        </dl>
      </div>
    </section>
  );
}
