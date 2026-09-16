import type { Metadata } from "next";

import {
  AiSongPicker,
  GenreBoard,
  GuestRequests,
  MixFlow,
  PlaylistWindow,
  ZoneSync,
} from "@/components/product/music/visuals";
import { Chapter, HowItWorks, ProductCta, ProductHero, ProductShell, WorksWith } from "@/components/product/template";
import { getProduct } from "@/lib/product-content";

const product = getProduct("music");

export const metadata: Metadata = {
  title: product.metaTitle,
  description: product.metaDescription,
};

export default function MusicPage() {
  return (
    <ProductShell>
      <ProductHero
        product={product}
        title={
          <>
            The right soundtrack in every room. <span className="text-white/40">All day.</span>
          </>
        }
        body="Build playlists from 130 genres, let AI pick the songs from a sentence, and play them in sync across your venue."
        visual={<PlaylistWindow />}
        facts={[
          { title: "Local sounds first", body: "Gengetone, Benga and Amapiano sit beside jazz, soul and lo-fi." },
          { title: "AI song picks", body: "Describe a mood and get a playlist of real songs, ready to play." },
          { title: "In step, room to room", body: "Audio zones keep every speaker on the same track at the same moment." },
        ]}
      />

      <Chapter
        index="01"
        kicker="Genres"
        title="Start from the sound of your city."
        body="Choose from about 130 genres — Kenyan and African styles like Gengetone, Benga, Arbantone and Amapiano, plus the global favourites your guests expect."
        facts={[
          "Set each location’s genres in a few taps",
          "Describe your space and AI Vibe Setup suggests up to three genres",
          "Search for any song and add it to a playlist",
        ]}
        visual={<GenreBoard />}
      />

      <Chapter
        index="02"
        kicker="AI song picks"
        title="Describe the mood. Get the songs."
        body="Type what you want in plain words and Tazama picks real songs that match — then fills the rest from your genres."
        facts={[
          "Ask for a number of songs or a length of time",
          "Every pick is matched to a track that’s ready to play",
          "Add genres to steer the mix",
        ]}
        visual={<AiSongPicker />}
        surface="raised"
        reverse
      />

      <Chapter
        index="03"
        kicker="Continuous playback"
        title="Music that doesn’t loop the same hour."
        body="Continuous mode blends your saved songs with fresh picks from your genres and from AI, and plays whatever’s been heard least recently first."
        facts={[
          "Your saved songs always stay in the rotation",
          "New genre picks every couple of hours, new AI picks every day",
          "Prefer a fixed rotation? Set the playlist to Repeat",
        ]}
        visual={<MixFlow />}
        layout="stacked"
      />

      <Chapter
        index="04"
        kicker="Audio zones"
        title="One zone. Every speaker in step."
        body="Group rooms into an audio zone — even across floors — and they play the same track in lockstep. Play, pause, skip or change the volume for the whole zone at once."
        facts={[
          "Give each zone a default playlist",
          "One volume slider for the zone, capped at the limit you set",
          "See how many of the zone’s speakers are online",
        ]}
        visual={<ZoneSync />}
        surface="raised"
        layout="stacked"
      />

      <Chapter
        index="05"
        kicker="Guest requests"
        title="Let guests pick the next song."
        body="Guests scan the QR code on any screen, join with just their name and request a song. It plays next, credited on the TV — then your playlist picks up right where it left off."
        facts={[
          "No app and no account for guests",
          "Up to three waiting requests per guest",
          "Guests can send reactions that float across the TV",
        ]}
        visual={<GuestRequests />}
        reverse
      />

      <HowItWorks
        title="Set the sound once. Let it run."
        steps={[
          { title: "Pick your sound", body: "Choose genres for each location, or describe the vibe and let AI suggest them." },
          { title: "Build a playlist", body: "Add songs yourself or generate one from a sentence." },
          { title: "Put it to work", body: "Make it an audio zone’s default, or play it inside a schedule." },
        ]}
      />

      <WorksWith current="music" />

      <ProductCta
        title="Give every room the right soundtrack."
        body="Start with one playlist and one zone. Tazama keeps it fresh from there."
      />
    </ProductShell>
  );
}
