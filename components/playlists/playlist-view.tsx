import { Cover } from "@/components/cover";
import { PlayButton } from "@/components/artists/play-button";
import { TrackRow } from "@/components/artists/track-row";
import type { Playlist } from "@/lib/artists";

/** Spotify-style playlist page body: gradient header + playable track list. */
export function PlaylistView({ playlist }: { playlist: Playlist }) {
  return (
    <div className="space-y-6">
      <header className="relative -mx-4 -mt-6 px-4 pt-6 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div aria-hidden className="absolute inset-0 -z-10 overflow-hidden">
          {playlist.cover && (
            <div
              className="absolute inset-0 scale-110 bg-cover bg-center blur-2xl"
              style={{ backgroundImage: `url(${playlist.cover})` }}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/35 to-background" />
        </div>

        <div className="flex flex-col gap-5 pt-12 pb-5 sm:flex-row sm:items-end">
          <Cover
            title={playlist.title}
            src={playlist.cover ?? undefined}
            sizes="208px"
            className="size-44 rounded-xl shadow-dark ring-1 ring-white/10 sm:size-52"
          />
          <div className="min-w-0 pb-1 text-white">
            <p className="text-xs font-semibold tracking-wide uppercase">
              Playlist
            </p>
            <h1 className="mt-2 text-4xl font-bold tracking-tight sm:text-6xl">
              {playlist.title}
            </h1>
            <p className="mt-3 text-sm text-white/85">
              {playlist.subtitle} · {playlist.tracks.length} songs
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 pb-6">
          <PlayButton tracks={playlist.tracks} />
        </div>
      </header>

      <div className="space-y-0.5">
        {playlist.tracks.map((track, i) => (
          <TrackRow key={track.id} track={track} index={i} queue={playlist.tracks} />
        ))}
      </div>
    </div>
  );
}
