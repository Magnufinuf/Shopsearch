export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-6 dark:bg-black">
      <main className="flex w-full max-w-2xl flex-col items-center gap-8 text-center">
        <h1 className="text-4xl font-semibold tracking-tight text-black dark:text-zinc-50">
          Don&apos;t search. Ask.
        </h1>
        <p className="max-w-md text-lg text-zinc-600 dark:text-zinc-400">
          Fortell oss hva du leter etter, så finner vi de beste alternativene.
        </p>
        <form className="flex w-full max-w-lg gap-2">
          <input
            type="text"
            placeholder="F.eks. svarte sneakers i str. 43 under 2000 kr"
            className="flex-1 rounded-full border border-zinc-300 px-5 py-3 text-base outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
          />
          <button
            type="submit"
            className="rounded-full bg-black px-6 py-3 font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
          >
            Søk
          </button>
        </form>
      </main>
    </div>
  );
}
