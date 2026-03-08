export default function DebateLoading() {
  return (
    <main className="min-h-dvh bg-background text-foreground flex flex-col items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="flex gap-2">
          {[0, 150, 300].map((delay) => (
            <div
              key={delay}
              className="w-3 h-3 rounded-full bg-purple-500/60 animate-bounce"
              style={{ animationDelay: `${delay}ms` }}
            />
          ))}
        </div>
        <p className="text-muted-foreground text-sm">Carregando debate...</p>
      </div>
    </main>
  );
}
