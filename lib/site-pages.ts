/**
 * Plain-language pages behind every non-Product nav item: Solutions,
 * Industries, Platform and Resources. One registry feeds the nav, the page
 * content, metadata and the "Related" links, so an item is named and described
 * the same way everywhere.
 *
 * Copy rule: explain for someone who has never heard of Tazama, and only claim
 * what the product does today (see the tazama-capability-reality audit — e.g.
 * no content-play or audience analytics, no music licensing, no AI assistants,
 * schedule recurrence/priority and content approval don't affect playback).
 */
import type { IndustryId, NavIconKey } from "./home-content";

export type PageGroup = "solutions" | "industries" | "platform" | "resources";

export interface SitePage {
  group: PageGroup;
  slug: string;
  href: string;
  /** Nav label and breadcrumb. */
  label: string;
  /** One line for the nav dropdown and related-page cards. */
  summary: string;
  icon: NavIconKey;
  metaDescription: string;
  title: string;
  /** Second half of the headline, shown dimmed. */
  titleAccent?: string;
  lead: string;
  inShort: { label: string; body: string }[];
  details: { title: string; body: string }[];
  faqs: { q: string; a: string }[];
  related: string[];
  cta: { title: string; body: string };
  industry?: IndustryId;
}

export const GROUP_LABEL: Record<PageGroup, string> = {
  solutions: "Solutions",
  industries: "Industries",
  platform: "Platform",
  resources: "Resources",
};

const inShort = (what: string, how: string, why: string) => [
  { label: "What it is", body: what },
  { label: "How it works", body: how },
  { label: "Why it helps", body: why },
];

export const SITE_PAGES: SitePage[] = [
  /* ------------------------------- Solutions ------------------------------- */
  {
    group: "solutions",
    slug: "scheduling",
    href: "/solutions/scheduling",
    label: "Scheduling",
    summary: "Plan the whole day once. Tazama runs it.",
    icon: "calendar",
    metaDescription:
      "Plan what plays and what shows at each time of day. Tazama switches your screens and music between sessions on its own, in every location.",
    title: "Plan the whole day once.",
    titleAccent: "Tazama runs it.",
    lead:
      "Scheduling lets you decide in advance what plays and what shows at each time of day — a breakfast menu and calm music in the morning, the lunch menu at midday, a happy-hour promotion in the evening — and Tazama switches between them on its own.",
    inShort: inShort(
      "A schedule is a plan for your day. It is split into sessions, and each session has its own content for your screens and its own playlist for your speakers.",
      "You lay the day out on a simple timeline, choose which locations, zones, rooms or screens it applies to, and activate it. Screens check in regularly and change sessions at the right time.",
      "Nobody has to remember to change the menu board or the music. Every location follows the same plan at the same time, without anyone touching a remote.",
    ),
    details: [
      { title: "Sessions", body: "Break the day into blocks such as Breakfast, Lunch and Evening, each with a start and end time." },
      { title: "Screens and speakers together", body: "A session can show images and videos on your screens and play a playlist on your speakers at the same time." },
      { title: "Content and music taking turns", body: "Play your content list, then a stretch of music — 1, 5, 10, 15, 30 or 60 minutes — and repeat. Or loop the content back to back." },
      { title: "Choose where it plays", body: "Apply a schedule to whole locations, particular zones or rooms, or hand-picked screens — even across several locations." },
      { title: "Change things while it runs", body: "Skip to the next piece of content, play a specific song, pause or preview — the screens follow." },
      { title: "Between sessions", body: "When no session is running, screens simply go back to their usual music." },
    ],
    faqs: [
      { q: "What can I put in a schedule?", a: "Videos and images from your content library, plus a playlist or genres for the music. Videos play muted, so the session’s music keeps going underneath." },
      { q: "What happens if two schedules overlap?", a: "When you activate a schedule that clashes with one that’s already running, you can choose to override it and the other one pauses. Otherwise Tazama won’t start the new one." },
      { q: "Can guests still request songs during a schedule?", a: "Yes. Guest song requests keep working during a session, and the playlist picks up where it left off." },
      { q: "How quickly do screens pick up a change?", a: "Screens check for updates on their own, so a change usually shows up within about half a minute." },
    ],
    related: ["/product/signage", "/product/music", "/platform/how-it-works", "/solutions/multi-location"],
    cta: { title: "Set up your day once.", body: "Build your first schedule in minutes and let every screen follow it." },
  },
  {
    group: "solutions",
    slug: "multi-location",
    href: "/solutions/multi-location",
    label: "Multi-location",
    summary: "One business, every branch, one view.",
    icon: "map",
    metaDescription:
      "Run every branch from one Tazama account. See each location’s screens, zones, music and content in one place and keep them consistent.",
    title: "One business. Every location.",
    titleAccent: "One control center.",
    lead:
      "Multi-location means you can run every branch — a café in Westlands, a restaurant in Nyali, a lounge in Kisumu — from one Tazama account, with the same tools and a clear view of each one.",
    inShort: inShort(
      "Every location you add gets its own zones, rooms, screens and speakers, but they all live in the same dashboard. You can look at the whole business at once or focus on a single branch.",
      "Add a location with a short guided setup, pair its screens with a 4-digit code and choose its music. From then on its status, what’s playing and its schedules sit alongside every other branch.",
      "You keep every branch consistent without visiting each one, you spot a screen that has gone offline straight away, and branch managers only get access to the locations they run.",
    ),
    details: [
      { title: "Guided setup", body: "Name the location, pin its address on a map, set its timezone and add a photo, then set up zones, rooms, screens and sound." },
      { title: "Status at a glance", body: "See how many screens are online, pending or offline in each location, and what’s playing there right now." },
      { title: "One plan or many", body: "Run the same schedule across several locations, or give each branch a plan of its own." },
      { title: "Reach every branch at once", body: "Push a song to one location or all of them, and send an announcement to any mix of locations, zones and rooms." },
      { title: "Access by location", body: "Managers only see the locations they’re assigned. Owners and admins see the whole business." },
      { title: "Room by room detail", body: "Each location keeps its own zones and rooms, with capacities, screens and speakers for every space." },
    ],
    faqs: [
      { q: "Can each location play different music?", a: "Yes. Each location can have its own genres, playlists and audio zones — or you can use the same ones everywhere." },
      { q: "Can a branch manager change another branch?", a: "No. Managers only see and manage the locations assigned to them." },
      { q: "How do I know if a screen at another branch stops working?", a: "Its status changes to offline in the dashboard, and the screens that have been offline the longest are listed so you know where to look." },
    ],
    related: ["/product/control-center", "/solutions/scheduling", "/platform/reliability", "/product/analytics"],
    cta: { title: "Bring every branch into one view.", body: "Start with your first location, then add the rest when you’re ready." },
  },
  {
    group: "solutions",
    slug: "guest-engagement",
    href: "/solutions/guest-engagement",
    label: "Guest engagement",
    summary: "QR song requests and live reactions.",
    icon: "qr",
    metaDescription:
      "Guests scan a QR code on your screen to request the next song or send reactions to the TV — no app, no account, with limits you can rely on.",
    title: "Let guests take part.",
    titleAccent: "No app needed.",
    lead:
      "Guest engagement turns your screens into something customers can interact with. Guests scan a QR code with their phone camera, then request the next song or send a reaction that appears on the TV.",
    inShort: inShort(
      "Every Tazama screen can show a QR code. Scanning it opens a simple web page for that venue — there’s no app to download and no account to create.",
      "The guest types their name, searches for a song and requests it. The song plays next and is credited on the TV, then your playlist carries on where it left off. Guests can also send reactions that float across the screen.",
      "It gives people a reason to look at your screens and stay a little longer, and it makes the room feel alive — while you stay in control of the music.",
    ),
    details: [
      { title: "Scan and join", body: "Guests join from any phone camera with just their name." },
      { title: "Requests play next", body: "A requested song plays next without resetting your playlist." },
      { title: "Credited on screen", body: "The TV shows who requested the song that’s playing." },
      { title: "Sensible limits", body: "Each guest can have up to three requests waiting, a room holds up to 50, and the same song can’t be queued twice." },
      { title: "Live reactions", body: "Guests can send reactions — hearts, fire, applause — that float across the TV." },
      { title: "Listen along", body: "Guests can see what’s playing and what’s coming up, and can even listen in sync on their phone." },
    ],
    faqs: [
      { q: "Do guests need to install anything?", a: "No. The QR code opens a web page in the phone’s browser. Guests only type their name." },
      { q: "Can guests take over the music?", a: "No. Requests are limited per guest and per room, duplicates aren’t allowed, and your playlist continues once a request has played." },
      { q: "Does it work with audio zones and schedules?", a: "Yes. Requests work in location rooms, in audio zones and during active schedules." },
    ],
    related: ["/product/music", "/industries/entertainment", "/industries/restaurants", "/platform/dashboard-to-room"],
    cta: { title: "Give your guests a say.", body: "Pair a screen and its guest QR code is ready straight away." },
  },
  {
    group: "solutions",
    slug: "advertising",
    href: "/solutions/advertising",
    label: "Advertising",
    summary: "Run campaigns or sell screen time.",
    icon: "target",
    metaDescription:
      "Use your screens as a media channel — promote your own offers or run campaigns for other brands, and see every ad play counted.",
    title: "Your screens can advertise.",
    titleAccent: "For you, or for other brands.",
    lead:
      "Advertising lets you use your screens as a media channel — to promote your own offers, or to run campaigns for brands that want to reach your customers — and see how every campaign performs.",
    inShort: inShort(
      "A campaign is an ad you want to run: a short video or image, the screens it should play on, and when. Tazama plays it in ad breaks on the screens you choose.",
      "When an ad break comes up, the ad takes over the screen and pauses the music, then hands everything back. Every time a screen plays the ad, Tazama counts it.",
      "Your screens are already in front of customers all day. Advertising puts that attention to work, with clear numbers on what played and where.",
    ),
    details: [
      { title: "Your offers or other brands", body: "Promote your own specials, or sell screen time to brands that want to reach your customers." },
      { title: "Choose where ads play", body: "Target campaigns to specific locations and screens. A location can also switch ads off entirely." },
      { title: "Inventory", body: "See what’s booked and what’s still free before you plan a campaign." },
      { title: "Every play counted", body: "Each ad play is recorded from the screen that played it, along with how often ads play to the end." },
      { title: "Estimates, explained", body: "Views, reach and revenue are estimated from room capacity, how busy the room usually is and an attention rate — and the assumptions are shown." },
      { title: "Announcements come first", body: "If an announcement starts while an ad is on screen, the announcement takes over." },
    ],
    faqs: [
      { q: "How are views estimated?", a: "For each play, Tazama combines the room’s capacity, how busy that room usually is at that hour, and an attention rate. They are estimates, and they’re labelled that way." },
      { q: "Will ads interrupt my music?", a: "Briefly. An ad pauses the music while it plays, then the music picks up again." },
      { q: "Can I keep ads out of a location?", a: "Yes. Each location has an allow-ads setting, and ads won’t play where it’s switched off." },
    ],
    related: ["/product/analytics", "/industries/retail", "/solutions/multi-location", "/product/signage"],
    cta: { title: "Put your screens to work.", body: "Start with a campaign for your own offers and see every play counted." },
  },

  /* ------------------------------- Industries ------------------------------ */
  {
    group: "industries",
    slug: "restaurants",
    href: "/industries/restaurants",
    label: "Restaurants & cafés",
    summary: "Music · Menus · Promotions",
    icon: "utensils",
    industry: "restaurants",
    metaDescription:
      "How restaurants and cafés use Tazama to run menu boards, music, promotions and announcements from one place — switching with the service.",
    title: "Tazama for restaurants",
    titleAccent: "and cafés.",
    lead:
      "Restaurants and cafés use Tazama to run their menus, music and promotions from one place — so the menu and the mood change with the service, without anyone reaching for a remote.",
    inShort: inShort(
      "Your TVs become menu boards and promotion screens, and your speakers play music chosen for your space. Everything is managed from the Tazama dashboard.",
      "Plan the day in sessions: the breakfast menu and calm music in the morning, the lunch menu and upbeat music at midday, happy hour in the evening. Tazama switches on time.",
      "Customers always see the right menu and the right offer, the atmosphere fits the time of day, and your team can focus on service.",
    ),
    details: [
      { title: "Menus that follow the service", body: "Show the breakfast, lunch or dinner menu at the right time, automatically." },
      { title: "Music for every part of the day", body: "Calm in the morning, lively at lunch, warm in the evening — or let AI pick songs to match." },
      { title: "Promotions on time", body: "Happy hour, the chef’s special or weekend brunch go on screen exactly when they apply." },
      { title: "Announcements", body: "“Last orders” or “your table is ready” — recorded once, played when you need it." },
      { title: "Song requests at the table", body: "Guests scan the QR code on a screen and pick the next song." },
      { title: "Every branch on the same plan", body: "Run one schedule across all your restaurants, or give each its own." },
    ],
    faqs: [
      { q: "How do I update a menu board?", a: "Upload the new image or video to your content library and add it to your schedule. Screens pick up the change on their own, usually within about half a minute." },
      { q: "Does it work on the TVs we already have?", a: "Yes. Any smart TV with a web browser works, or an Android TV box for screens that should run unattended." },
      { q: "Can guests request songs?", a: "Yes. Guests scan the QR code on a screen, request a song and it plays next — with limits per guest so the music stays yours." },
    ],
    related: ["/solutions/scheduling", "/product/signage", "/solutions/guest-engagement", "/product/announcements"],
    cta: { title: "Run your restaurant’s screens and music from one place.", body: "Start with one menu board and one playlist." },
  },
  {
    group: "industries",
    slug: "retail",
    href: "/industries/retail",
    label: "Retail",
    summary: "Product promotions · Advertising · Music",
    icon: "bag",
    industry: "retail",
    metaDescription:
      "How retailers use Tazama to run product promotions and campaigns on every screen, keep in-store music on-brand and sell screen time to brands.",
    title: "Tazama for retail.",
    lead:
      "Retailers use Tazama to put product promotions on every screen, keep the in-store music on-brand, and run the same campaign in every store at the same time.",
    inShort: inShort(
      "Screens around the store show your campaigns and product videos, while the speakers play music that fits your brand — all managed centrally.",
      "Upload campaign content once, choose which stores and screens should show it, and schedule when. Announcements can call out offers in store.",
      "Every store tells the same story on the same day, and you can see how many times each ad campaign played.",
    ),
    details: [
      { title: "Product promotions", body: "Put new arrivals and offers on screens wherever shoppers are looking." },
      { title: "Campaigns across stores", body: "Send the same campaign to every store, or only the ones taking part." },
      { title: "Sell screen time to brands", body: "Run campaigns for suppliers and brands, with every play counted." },
      { title: "On-brand music", body: "Choose the sound of your stores, and give different areas different music with audio zones." },
      { title: "In-store announcements", body: "Record offers or store notices and play them to the areas you choose." },
      { title: "Status for every store", body: "See which screens are online in each store from one dashboard." },
    ],
    faqs: [
      { q: "Can brands advertise on our screens?", a: "Yes. You can run campaigns for other brands and see how many times each one played, alongside estimated views." },
      { q: "Can we run a promotion in only some stores?", a: "Yes. Choose the locations, zones or screens where it should appear." },
      { q: "Can different areas of a store play different music?", a: "Yes. Audio zones let you group rooms or areas so each group plays its own music in sync." },
    ],
    related: ["/solutions/advertising", "/solutions/multi-location", "/product/signage", "/product/music"],
    cta: { title: "Put every store on the same page.", body: "Start with one campaign across your screens." },
  },
  {
    group: "industries",
    slug: "hotels",
    href: "/industries/hotels",
    label: "Hotels",
    summary: "Guest information · Promotions · Music",
    icon: "hotel",
    industry: "hotels",
    metaDescription:
      "How hotels use Tazama for guest information screens, promotions for restaurants and spa, and a different mood in the lobby, bar and pool areas.",
    title: "Tazama for hotels.",
    lead:
      "Hotels use Tazama to welcome guests with useful information on screen, promote their restaurants, bars and spa, and set a different mood in every public space.",
    inShort: inShort(
      "Each space in the hotel — lobby, restaurant, bar, spa, rooftop — can have its own screens and its own music, all managed from one dashboard.",
      "Set the hotel up as zones and rooms, give each space its own playlist and content, and schedule changes through the day, from breakfast times in the morning to bar promotions at night.",
      "Guests find what they need without asking, your restaurants and bars get noticed, and every space sounds right for the time of day.",
    ),
    details: [
      { title: "Guest information", body: "Breakfast times, pool hours and today’s events on screens where guests pass." },
      { title: "Promote your outlets", body: "Put the restaurant, bar and spa in front of guests throughout the building." },
      { title: "A sound for every space", body: "Calm in the spa, lively on the rooftop — each area with its own music." },
      { title: "From breakfast to late night", body: "Schedules change screens and music as the day goes on." },
      { title: "Announcements to chosen areas", body: "Play a message in the lobby and restaurant without interrupting the spa." },
      { title: "Several properties", body: "Manage more than one hotel from the same account." },
    ],
    faqs: [
      { q: "Can the lobby and the bar play different music?", a: "Yes. Each room or zone can have its own playlist, and audio zones keep grouped areas in sync." },
      { q: "Can we show information only in certain areas?", a: "Yes. Choose exactly which zones, rooms or screens should show each piece of content." },
      { q: "Can we manage more than one hotel?", a: "Yes. Each property is a location in the same account, with managers who see only their own property." },
    ],
    related: ["/solutions/multi-location", "/product/music", "/product/signage", "/product/announcements"],
    cta: { title: "Make every space in your hotel feel right.", body: "Start with the lobby, then add the rest of the property." },
  },
  {
    group: "industries",
    slug: "healthcare",
    href: "/industries/healthcare",
    label: "Healthcare",
    summary: "Waiting-room content · Calm music · Notices",
    icon: "stethoscope",
    industry: "healthcare",
    metaDescription:
      "How clinics use Tazama to keep waiting areas calm and informed with soft music, clear notices on screen and announcements when needed.",
    title: "Tazama for healthcare.",
    lead:
      "Clinics and healthcare providers use Tazama to keep waiting areas calm and informed — with soft music, clear notices on screen, and announcements when they’re needed.",
    inShort: inShort(
      "Screens in waiting areas show health notices, service information and wellness content, while the speakers play calm music.",
      "Upload notices to your content library, schedule them for when they’re relevant, and choose which clinics and waiting areas should show them.",
      "Patients get useful information while they wait, the room feels calmer, and every clinic shares the same up-to-date messages.",
    ),
    details: [
      { title: "Notices and service information", body: "Opening hours, services and health campaigns on screens in the waiting area." },
      { title: "Calm music", body: "Soft background music that makes waiting feel shorter." },
      { title: "Gentle announcements", body: "Lower the music instead of stopping it when a message plays." },
      { title: "Urgent messages", body: "Emergency announcements fill the screen in red so nobody misses them." },
      { title: "Every clinic up to date", body: "Change a notice once and every clinic that should show it updates." },
      { title: "Access per clinic", body: "Clinic managers only see and manage their own location." },
    ],
    faqs: [
      { q: "Can different clinics show different information?", a: "Yes. Choose the locations, zones or screens for each notice." },
      { q: "Can announcements lower the music instead of stopping it?", a: "Yes. You choose whether the music pauses or lowers to a level you set." },
      { q: "Is there a way to show an urgent message?", a: "Yes. Emergency announcements take over the screen with a full-screen red style." },
    ],
    related: ["/product/signage", "/product/announcements", "/solutions/multi-location", "/solutions/scheduling"],
    cta: { title: "Calmer, better-informed waiting rooms.", body: "Start with one waiting area and one screen." },
  },
  {
    group: "industries",
    slug: "financial-services",
    href: "/industries/financial-services",
    label: "Financial services",
    summary: "Product promotions · Branch notices · Music",
    icon: "landmark",
    industry: "financial",
    metaDescription:
      "How banks, SACCOs and financial services providers use Tazama to promote products in branches, share notices and keep every branch on message.",
    title: "Tazama for financial services.",
    lead:
      "Banks, SACCOs and other financial services providers use Tazama to promote products in the banking hall, share branch notices and keep every branch on message.",
    inShort: inShort(
      "Screens in your branches show product campaigns and notices, and the speakers play ambient music — all managed centrally.",
      "Create a campaign once, choose the branches and screens that should show it, and schedule it. Notices for a single branch can go to that branch only.",
      "Customers learn about your products while they wait, and head office knows every branch is showing the right message.",
    ),
    details: [
      { title: "Product promotions", body: "Savings, loans and new services on screens in the banking hall." },
      { title: "Branch notices", body: "Holiday hours or service changes, shown only where they apply." },
      { title: "Ambient music", body: "Background music that keeps the banking hall comfortable." },
      { title: "One message, every branch", body: "Head office can run the same campaign in every branch at once." },
      { title: "Access per branch", body: "Branch managers only see the locations they’re responsible for." },
      { title: "Screen status for every branch", body: "Know straight away if a screen in any branch goes offline." },
    ],
    faqs: [
      { q: "Can head office control what every branch shows?", a: "Yes. Owners and admins manage content and schedules across all locations." },
      { q: "Can a branch show its own notices?", a: "Yes. Target a notice to a single location, zone or screen." },
      { q: "Will we know if a screen stops working?", a: "Yes. Screens that stop checking in show as offline in the dashboard." },
    ],
    related: ["/solutions/multi-location", "/product/signage", "/product/control-center", "/platform/reliability"],
    cta: { title: "Keep every branch on message.", body: "Start with one campaign in one branch." },
  },
  {
    group: "industries",
    slug: "entertainment",
    href: "/industries/entertainment",
    label: "Entertainment",
    summary: "Song requests · Live reactions · Promotions",
    icon: "ticket",
    industry: "entertainment",
    metaDescription:
      "How bars, lounges and entertainment venues use Tazama to let the crowd request songs, send reactions to the big screen and promote events.",
    title: "Tazama for entertainment.",
    lead:
      "Bars, lounges, clubs and entertainment venues use Tazama to let the crowd join in — guests request songs and send reactions to the big screen — while you promote events and sell screen time.",
    inShort: inShort(
      "Your TVs show music videos, event promotions and a QR code guests can scan. Your speakers play the music, and the crowd gets a say in what’s next.",
      "Guests scan the code, request songs and send reactions that appear on screen. You plan promotions and ad breaks around the night with schedules and campaigns.",
      "The room feels more alive, guests stay engaged, and your screens promote tonight’s event — or earn money from brands.",
    ),
    details: [
      { title: "Song requests from the crowd", body: "Guests request songs from their phones; requests play next, credited on screen." },
      { title: "Reactions on the big screen", body: "Hearts, fire and applause float across the TV in real time." },
      { title: "Music videos", body: "TVs can show the video for the song that’s playing, full screen." },
      { title: "Event promotions", body: "Put tonight’s line-up and drink specials on screen at the right time." },
      { title: "Sell screen time", body: "Run campaigns for brands and see every play counted." },
      { title: "Announcements", body: "Speak to the whole venue — the music lowers or pauses while you do." },
    ],
    faqs: [
      { q: "Can the crowd take over the music?", a: "No. Requests play next but are limited per guest and per room, and your playlist carries on afterwards." },
      { q: "Can our TVs show music videos?", a: "Yes. Screens can show the music video for what’s playing, full screen." },
      { q: "Can we promote tonight’s event?", a: "Yes. Add it to a schedule so it shows at the right time, on the screens you choose." },
    ],
    related: ["/solutions/guest-engagement", "/product/music", "/solutions/advertising", "/platform/dashboard-to-room"],
    cta: { title: "Let the crowd join in.", body: "Pair a screen tonight and put the QR code up." },
  },

  /* -------------------------------- Platform -------------------------------- */
  {
    group: "platform",
    slug: "how-it-works",
    href: "/platform/how-it-works",
    label: "How it works",
    summary: "Create, schedule, publish, monitor.",
    icon: "workflow",
    metaDescription:
      "How Tazama works: a web dashboard where you manage content and music, and a player that runs full screen on your TVs. Four simple steps.",
    title: "How Tazama works.",
    titleAccent: "In four steps.",
    lead:
      "Tazama connects the TVs and speakers in your venues to one online dashboard. You choose what should play and show, decide where and when, and Tazama makes it happen on every screen.",
    inShort: inShort(
      "Tazama has two parts: the dashboard, where you manage everything from a web browser, and the player, which runs full screen on your TVs.",
      "Create — upload content and build playlists. Schedule — decide when and where they play. Publish — screens pick it up on their own. Monitor — see what’s playing and which screens are online.",
      "You set things up once and the whole venue follows. No USB sticks, no printed posters and no walking from TV to TV.",
    ),
    details: [
      { title: "The dashboard", body: "Runs in a web browser on a laptop, tablet or phone — nothing to install." },
      { title: "The player", body: "A full-screen player for your TVs. It needs no login and remembers which screen it is." },
      { title: "Pairing", body: "Connect a TV by entering a 4-digit code, either on the TV or in the dashboard." },
      { title: "Content and music", body: "Keep your videos, images and playlists in one library and use them anywhere." },
      { title: "Schedules", body: "Plan the day in sessions, and screens switch between them on time." },
      { title: "Status", body: "See which screens are online and what each location is playing." },
    ],
    faqs: [
      { q: "Do I need special hardware?", a: "No. Any smart TV with a web browser works, or an Android TV box for screens that should run unattended." },
      { q: "How do changes reach the screens?", a: "Some things arrive instantly, like announcements. For everything else, screens check for changes regularly and update on their own." },
      { q: "Can I manage Tazama from my phone?", a: "Yes. The dashboard runs in a web browser, so it works on a laptop, tablet or phone." },
    ],
    related: ["/product/control-center", "/platform/dashboard-to-room", "/resources/hardware", "/solutions/scheduling"],
    cta: { title: "See it working in your own venue.", body: "Create an account and connect your first screen in a few minutes." },
  },
  {
    group: "platform",
    slug: "dashboard-to-room",
    href: "/platform/dashboard-to-room",
    label: "From dashboard to the room",
    summary: "What you choose is what customers see.",
    icon: "screen-link",
    metaDescription:
      "Everything in Tazama is tied to a real place — location, zone, room and screen — so a change in the dashboard appears on exactly the right TV.",
    title: "What you choose",
    titleAccent: "is what customers see.",
    lead:
      "Everything you set in the Tazama dashboard is tied to a real place — a location, a zone, a room and a screen. When you change something, that exact screen changes.",
    inShort: inShort(
      "Tazama organises your business the way it exists in real life: a business has locations, locations have zones, zones have rooms, and rooms have screens and speakers.",
      "Pick a screen — say Westlands / Ground Floor / Main Screen — choose what it should show, and the TV on that wall updates. Guests who scan its QR code see what’s playing in that room.",
      "There’s no guessing which TV is which. You can change one screen, one room, one floor or every location, and know exactly where it will appear.",
    ),
    details: [
      { title: "Locations", body: "Each venue or branch you run, with its address and timezone." },
      { title: "Zones", body: "Larger areas inside a location, such as the Ground Floor or the Terrace." },
      { title: "Rooms", body: "Spaces inside a zone, like the Bar or the Dining room, each with a type and capacity." },
      { title: "Screens and speakers", body: "Each device belongs to a room and shows its own live status." },
      { title: "Audio zones", body: "Group rooms — even on different floors — so their speakers play the same music in sync." },
      { title: "A QR code per screen", body: "Every screen has its own guest link, so requests land in the right room." },
    ],
    faqs: [
      { q: "What’s the difference between a zone and a room?", a: "A zone is a larger area of a location, like the Ground Floor. Rooms sit inside zones, like the Bar or the Dining room." },
      { q: "What if we move a TV to a different room?", a: "Move it in the dashboard. The screen stays paired and follows the room it’s been moved to." },
      { q: "What is an audio zone?", a: "A group of rooms whose speakers play the same music in sync, controlled together — even if the rooms are on different floors." },
    ],
    related: ["/product/control-center", "/platform/how-it-works", "/solutions/guest-engagement", "/resources/hardware"],
    cta: { title: "Map your venue into Tazama.", body: "Add a location, name its rooms and connect the first screen." },
  },
  {
    group: "platform",
    slug: "reliability",
    href: "/platform/reliability",
    label: "Reliability",
    summary: "Built for real-time, all-day operation.",
    icon: "activity",
    metaDescription:
      "Tazama screens run on their own, reconnect when they can and report their status, so you can see every screen’s health from the dashboard.",
    title: "Built to keep your business",
    titleAccent: "running.",
    lead:
      "Tazama is designed for real venues that are open all day. Screens run on their own, reconnect when they can, and you can see the status of every screen from the dashboard.",
    inShort: inShort(
      "Reliability in Tazama means screens that keep playing without anyone looking after them, and a clear view of anything that needs your attention.",
      "Screens check in regularly. The dashboard shows each one as online, pending or offline and lists those that have been offline the longest. Schedules switch sessions by the clock, and announcements and ads hand playback back when they finish.",
      "You find out about a problem from the dashboard rather than from a customer, and your venues keep looking and sounding right all day.",
    ),
    details: [
      { title: "Screens that remember", body: "A paired screen remembers its pairing and reconnects on its own." },
      { title: "Live status", body: "Online, pending and offline status refreshes about every 10 seconds." },
      { title: "Know where to look", body: "The screens that have been offline the longest are listed first." },
      { title: "Schedules on time", body: "Sessions switch by the clock, without anyone pressing a button." },
      { title: "Announcements that arrive", body: "Announcements reach screens instantly, with a regular backup check — and screens that were offline for a while skip old ones." },
      { title: "Starts on boot", body: "Android TV boxes can be set to open Tazama as soon as they switch on." },
    ],
    faqs: [
      { q: "Do screens need an internet connection?", a: "Yes. Screens need a connection to play music and pick up changes. When a connection comes back, they reconnect on their own, and the dashboard shows their status in the meantime." },
      { q: "How do I know if a screen stops working?", a: "It shows as offline in the dashboard, and the longest-offline screens are listed so you can find them quickly." },
      { q: "What happens after an announcement or ad?", a: "When it finishes, the screen returns to its normal playback." },
    ],
    related: ["/resources/hardware", "/product/control-center", "/product/analytics", "/platform/how-it-works"],
    cta: { title: "Screens that look after themselves.", body: "Pair a screen and watch its status in the dashboard." },
  },

  /* -------------------------------- Resources ------------------------------- */
  {
    group: "resources",
    slug: "hardware",
    href: "/resources/hardware",
    label: "Supported hardware",
    summary: "Runs on the TVs and speakers you have.",
    icon: "tv",
    metaDescription:
      "Tazama runs on smart TVs, Android TV boxes and web browsers, and plays sound through your existing speakers. No proprietary hardware to buy.",
    title: "Runs on what",
    titleAccent: "you already have.",
    lead:
      "Tazama doesn’t need special players or proprietary boxes. It runs on smart TVs, Android TV boxes and web browsers, and plays sound through the speakers you already have.",
    inShort: inShort(
      "The Tazama player is a web page made for TVs. Open it on a screen, enter a 4-digit pairing code, and that screen becomes part of your Tazama account.",
      "On a smart TV, open the player in the TV’s web browser. For screens that should run unattended, use an Android TV box set up to open Tazama full screen whenever it turns on. Connect the TV or box to your sound system for audio.",
      "You can start with the TVs already on your walls, and add a small Android TV box only where a screen needs to run on its own.",
    ),
    details: [
      { title: "Smart TVs", body: "Any smart TV with a web browser can run the Tazama player." },
      { title: "Android TV boxes", body: "Run Tazama full screen in kiosk mode and start it on boot. There’s a documented setup for the X96 Mini (Android 9)." },
      { title: "Your sound system", body: "Play audio through the TV or box into your existing speakers or amplifier." },
      { title: "Laptops and tablets", body: "Any device with a modern web browser can run the dashboard or the player." },
      { title: "Pairing", body: "Connect a screen with a 4-digit code. It remembers its pairing afterwards." },
      { title: "Internet connection", body: "Each screen needs a stable internet connection to stream music and pick up changes." },
    ],
    faqs: [
      { q: "Do I need to buy a Tazama device?", a: "No. There’s no Tazama-branded hardware to buy — use the TVs and speakers you have." },
      { q: "Is there an app to install on the TV?", a: "No. The player runs in the browser. On Android TV boxes, a kiosk browser opens it full screen automatically." },
      { q: "What if a TV has no web browser?", a: "Connect an Android TV box to it. The box runs the player and the TV simply displays it." },
    ],
    related: ["/platform/how-it-works", "/platform/reliability", "/product/control-center", "/contact"],
    cta: { title: "Start with the screens you already have.", body: "Open Tazama on a TV, enter the code, and you’re live." },
  },
  {
    group: "resources",
    slug: "contact",
    href: "/contact",
    label: "Contact sales",
    summary: "Tell us about your venues.",
    icon: "mail",
    metaDescription:
      "Talk to the Tazama team about your venues — how many locations and screens you have, and what you’d like them to do.",
    title: "Talk to our team.",
    lead:
      "Tell us about your business — how many locations and screens you have and what you’d like them to do — and we’ll help you plan your setup. We usually reply within a day or two.",
    inShort: [
      { label: "What to include", body: "The type of business, how many locations you have, roughly how many screens and speakers each has, and what you want to run: music, signage, announcements, advertising or all of them." },
      { label: "What happens next", body: "We reply by email to answer your questions and, if it helps, walk you through Tazama using your own locations as the example." },
      { label: "Prefer to start now?", body: "You can create an account and connect your first screen yourself — it only takes a few minutes." },
    ],
    details: [],
    faqs: [
      { q: "Can I try Tazama before talking to sales?", a: "Yes. Create an account, add a location and pair a TV to see it working." },
      { q: "Can you help us set up several locations?", a: "Yes. Tell us how many locations and screens you have, and we’ll help you plan the setup." },
    ],
    related: ["/platform/how-it-works", "/resources/hardware", "/solutions/multi-location", "/product/control-center"],
    cta: { title: "Ready when you are.", body: "Start on your own, or send us a message and we’ll help." },
  },
];

export function getSitePage(group: PageGroup, slug: string): SitePage | undefined {
  return SITE_PAGES.find((p) => p.group === group && p.slug === slug);
}

export const pagesInGroup = (group: PageGroup) => SITE_PAGES.filter((p) => p.group === group);
