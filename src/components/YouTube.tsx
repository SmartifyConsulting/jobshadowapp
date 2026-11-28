/** `id` holds either a bare YouTube video id, or a direct video URL (e.g. CareerOneStop's
 * mp4 occupation videos). CareerOneStop asks that it be cited as the source when reused. */
export function YouTube({ id, title }: { id: string; title: string }) {
  if (/^https?:\/\//i.test(id)) {
    const isCareerOneStop = /careeronestop\.org/i.test(id);
    return (
      <div className="overflow-hidden rounded bg-foreground shadow-warm">
        <video className="aspect-video w-full" controls preload="metadata" title={title}>
          <source src={id} type="video/mp4" />
        </video>
        {isCareerOneStop && (
          <p className="bg-foreground px-2 py-1 text-right text-[11px] text-background/70">
            Video source: CareerOneStop.org, U.S. Department of Labor Employment and Training
            Administration
          </p>
        )}
      </div>
    );
  }
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
