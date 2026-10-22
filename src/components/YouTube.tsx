export function YouTube({ id, title }: { id: string; title: string }) {
  return (
    <div className="overflow-hidden rounded bg-foreground shadow-warm">
      <iframe
        className="aspect-video w-full"
        src={`https://www.youtube-nocookie.com/embed/${id}`}
        title={title}
        loading="lazy"
        allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
}
