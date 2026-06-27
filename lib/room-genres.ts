/**
 * Room genre catalog — the big, searchable taxonomy used to tag a room's vibe
 * in the create-room wizard ("What's playing in the booth?"). Distinct from the
 * curated, *seedable* `lib/genres.ts` (those 12 drive the YouTube catalog).
 *
 * Labels are kept verbatim; the stored value is a deterministic slug. Pure data,
 * safe on client + server.
 */
import { slugify } from "@/lib/rooms/slug";

const RAW = `Play Anything
Pop
Electronic
Rock
Dance
World
New Age
Alternative
Jazz
Latin
Classical
House
Folk
Instrumental
Easy Listening
Techno
Country
Reggae
Tech House
Spiritual
Trance
Deep House
Inspirational
Ambient
Christian
Blues
Electronica
Drum & Bass
Holiday
Indie Rock
Dancehall
Spoken Word
Soundtrack
Electro
Punk
Compilation
Dubstep
Americana
Karaoke
Pakistan
Acoustic
Heavy Metal
Brazilian
Gospel
Contemporary Christian
Reggaeton
Indie Pop
Christmas
Modern Rock
African
Children
Chillout
Funk
Chamber Music
Adult Contemporary
Comedy
Smooth Jazz
Classic Rock
Hip Hop/Rap
Pop Rock
Cumbia
Orchestral
Salsa
Phonk
Minimal
Piano
Urban
Psychedelic
Hardcore
Industrial
Garage Rock
Hard Dance
Hard Rock/Metal
Downtempo
R&B/Soul
Breaks
Dream Pop
Relaxation
Miscellaneous
Modern Country
Party Rap
Instrumental Rock
Tango
Soft Rock
Lounge
J-Rock
East Coast
Inspiritual
Chill
Bluegrass
West Coast Rap
Flamenco
Death Metal
Solo Instrumental
Disco
Dub
Power Pop
Mpb
Synthpop
Classic Country
New Wave
Opera
Grunge
Educational
Ska
Live
Ranchero
Big Band
Alternative/Indie
Hardstyle
Bolero
Post-Punk
Rockabilly
Trip Hop
Middle Eastern
Emo
Banda
Celtic
Healing
Gangsta
Folklore
Black Metal
Heavy
Bachata
Choral Music
New Romantic
Merengue
Lullabies
Black
Indian
Greek
Singer Songwriter
Spanish
Theatre Scores
Caribbean
2000s
Bass
Goth
Roots
Adult Alternative
Minimal Techno
Religious
Nature
Bossa Nova
Norte
Mariachi
Audiobook
Instrumental Pop
New School
Swing
Poetry
Oldies
Schlager
Electronic / Experimental
Self-Help
South American
Southern Rock
Others
Avantgarde
Downbeat
Free Jazz
Cool Jazz
Native American
Power Metal
Orchestral Music
Baroque
West Coast
Electric Blues
IDM
1990s
Neo-Classical
Tropicalia
Mediterranean
Samba
French
Breakbeat
Devotional
Outlaw Country
Vallenato
Acid Jazz
Sound Effects
Asian
Beats & Breaks
Bebop
Space Rock
Variete Francaise
Southern Gospel
International
Tropical
Symphony
Crossover
Irish
Guitar
Thrash
Hard Trance
Britpop
Tribal House
Arabic
1980s
Ragga
Noise
Romantic
Hard House
Concerto
Western European
Grindcore
1970s
Rumba
Cuban
Political
Freestyle
British Invasion
Deep
Math Rock
Nostalgia
Grime
Chanson
Italian
Afro-Cuban
Rock And Roll
Mexican
Tejano
Bollywood
Turkish
TV
Bhangra
Big Beat
Glam
Southern Soul
Surf
Fado
Literature
Motown
Glitch
Hindi
Leftfield
Diva
Psychobilly
Island
Eastern European
Cabaret
Trova
Rai
Mdm
Argentinean
Zouk
I.D.M.
Abstract
Volksmusik
Organ
Dixieland
Compilations
Ragtime
Punjabi
Environmental
Remix
Satire
Polka
Psychadelic
Word
Musical
Space
Glam Rock
Hard Bop
Zydeco
Classical Vocal
Italo
Broadway
Chicago Blues
Violin
VF
Creole
Central American
Son
Fantasy
Ballad
Krautrock
Chinese
Post-Bop
Lovers Rock
Stoner Rock
Modern
German
Gypsy
Happy Hardcore
DJ Mix
Bop
Post Rock
Jungle
Classical Sacred
Movie
1960s
Tech/Minimal
European
Art Rock
Goth Rock
Klezmer
Jam Band
Ghazal
Europop
Parody
Commercial Alternative
Lo-Fi
Acid
Goth-Metal
Minimal House
Girl Group
Gothic
Portuguese
Scottish
Pachanga
Tribal
Basque
Vocal/Nostalgia
Urban Latino
UK Garage
VI
Minimal / Tech
Lectures
Brit-Punk
Rave
Thrash Metal
Kindermusik
Skate-Punk
British
Australian
Eurodance
Old Time
Crunk
Arabesque
Mod
Jump Blues
Jazzy Pop
Jewish
Keyboard/Synthesizer
Black Music
Praise And Worship
Hindustani Classical
Classic R&B
Historical
Exotica
Nu Metal
Doowop
West Coast Blues
Nu Jazz
Pacific Island
Acapella
Trumpet
Speed Metal
Electronic / Ebm
Saxophone
Doom Metal
Delta Blues
Novelty
Singalong
International Punk
Noise Rock
Russian
Raggaeton
Texas Blues
Swedish
Cajun
Teen Pop
Romanian
Southern
New Orleans
Hair Band
Soft
Canzone Italiana
Tenor Sax
Laiko
Darkwave
Film
Carnatic Classical
Meditation/Relaxation
Deutschrock
Polydor
Swiss
Alto Sax
Minimalist
Commercial
Broken Beats
Classic Pop Vocals
Stax
US Blues
Southern Rap
Indipop
1950s
Central European
Mercury
Radio
Nashville
Flute
Psytrance / Goa
Danish
EBM
Symphonic Rock
Classic Jazz Vocals
Old Skool
Austrian
Modern Jazz Vocals
A&M
OPM Pop
Entehno
Modern Urban Blues
Drums
Pre-War
Concord
Harmonica
Showtunes
Harp
Prestige
Forr
Bengali
Tech Trance
Oi
Honkytonk
Clarinet
Vibraphone/Marimba
Classic Electronic
MCA
Humour
Deram
Show Vocals
Kaberett
Decca
Trombone
Moroccan
Tamil
Philips
Speech
UK Blues
Japanese
Cuban Son
Indian Classic Music
Euro-House
Garage Band
Reed
Senegalese
Rhythmic Soul
Film Composers
Bulgarian
Guitar Rock
Telugu
DJ Toasters
Delta
Ethereal
Cornet
South African
Radio Play
Marathi
Malayalam
Kannada
Indie Rock / Alternative Rock
Assamese
Melodic Trance
Classic - Orchestral
Classic - Solo Piano
Gujurati
Mali
Acid Punk
UK Techno
Oriya
Classic Gospel`;

export interface RoomGenre {
  value: string;
  label: string;
}

/** The full catalog, in catalog order, de-duplicated by slug value. */
export const ROOM_GENRES: RoomGenre[] = (() => {
  const seen = new Set<string>();
  const out: RoomGenre[] = [];
  for (const label of RAW.split("\n")) {
    const name = label.trim();
    if (!name) continue;
    const value = slugify(name);
    if (!value || seen.has(value)) continue;
    seen.add(value);
    out.push({ value, label: name });
  }
  return out;
})();

const BY_VALUE = new Map(ROOM_GENRES.map((g) => [g.value, g]));

export function roomGenreLabel(value: string): string {
  return BY_VALUE.get(value)?.label ?? value;
}

/** Max genres a room can be tagged with. */
export const MAX_ROOM_GENRES = 3;

/** Case-insensitive substring search over labels (caller caps the result). */
export function searchRoomGenres(query: string, limit = 60): RoomGenre[] {
  const q = query.trim().toLowerCase();
  if (!q) return ROOM_GENRES.slice(0, limit);
  const out: RoomGenre[] = [];
  for (const g of ROOM_GENRES) {
    if (g.label.toLowerCase().includes(q)) {
      out.push(g);
      if (out.length >= limit) break;
    }
  }
  return out;
}
