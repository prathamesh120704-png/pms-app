import Link from "next/link";

const features = [
  {
    title: "Goals",
    description:
      "Set team and individual objectives, track progress, and keep everyone aligned through the cycle.",
  },
  {
    title: "Reviews",
    description:
      "Run structured performance reviews with a consistent process for managers and employees.",
  },
  {
    title: "Feedback",
    description:
      "Capture ongoing input so conversations at review time are based on real work, not memory.",
  },
];

export default function Home() {
  return (
    <div className="flex flex-1 flex-col bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
      <header className="flex items-center justify-between px-6 py-5 sm:px-10">
        <p className="text-sm font-semibold tracking-tight">PMS</p>
        <Link
          href="/sign-in"
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Sign In
        </Link>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-6 pb-20 pt-10 sm:px-10">
        <div className="max-w-2xl">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Performance Management
          </h1>
          <p className="mt-4 text-lg leading-7 text-zinc-600 dark:text-zinc-400">
            Goals, reviews, and feedback for a 200-person services company —
            in one place.
          </p>
        </div>

        <ul className="mt-14 grid gap-4 sm:grid-cols-3">
          {features.map((feature) => (
            <li
              key={feature.title}
              className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <h2 className="text-base font-semibold tracking-tight">
                {feature.title}
              </h2>
              <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                {feature.description}
              </p>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
