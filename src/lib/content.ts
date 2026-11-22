import s1 from "@/assets/story-1.png.asset.json";
import s2 from "@/assets/story-2.png.asset.json";
import s3 from "@/assets/story-3.png.asset.json";
import s4 from "@/assets/story-4.png.asset.json";

export const STORIES = [
  { name: "Godfrey", img: s1.url, quote: "Job shadowing helped me so much in choosing mining engineering as a career path. It gave me a richer experience than just reading a job description and the questions I had regarding the field were answered fully." },
  { name: "Lorcan", img: s2.url, quote: "I was in a job shadow for chemical engineering and mineral processing. I got to learn more about my work place and got exposed to every skill and knowledge that my job requires." },
  { name: "Raphaela", img: s3.url, quote: "My Job shadowing experience was amazing! It definitely confirmed my expectations for the career path I have chosen, and gave real insight into what architecture entails. Thank you Job Shadow.co.za!" },
  { name: "Elizabeth", img: s4.url, quote: "I discovered the weaknesses that I personally had to enable me to work more in bettering myself to be able to follow my career path successfully." },
];

export const VIDEOS = [
  { id: "_Fbsyh_YpPg", title: "How to book a Job Shadow Online" },
  { id: "z7R6BoDQdI0", title: "How To Register" },
  { id: "Z3F7tMnTVtY", title: "How to Cancel and reschedule a booking" },
];

export const CORPORATE_VIDEO = { id: "72zG7HbT_5U", title: "JOB SHADOW corporate video 2020" };
export const STORIES_VIDEO = { id: "APy164TJ0tI", title: "JOB SHADOW Real Stories 2020" };

export const PARTNER_HERO = { title: "Open your doors. Change a trajectory.", sub: "Too many South African students drop out of their first degree because it wasn't what they imagined. A single day of shadowing can fix that." };
export const PARTNER_BLOCKS = [
  { type: "host", title: "Hosts", points: ["One day or one hour of your time", "We vet, brief and prepare every scholar", "Build employer brand with future talent", "Counts toward B-BBEE skills development"], cta: "Become a host" },
  { type: "school", title: "Schools", points: ["Structured exposure for Grades 9–12", "Supports subject choice & Life Orientation", "Group bookings and term calendars", "Progress reports for counsellors"], cta: "Partner your school" },
  { type: "mentor", title: "Mentors", points: ["One day or one hour of your time", "We vet, brief and prepare every scholar", "Share your career experience directly", "Build your professional profile"], cta: "Become a mentor" },
] as const;
// Sponsors hidden for now - previous block: { type: "sponsor", title: "Sponsors", points: ["Fund placements for under-resourced learners", "Choose a province, school or field", "Impact report with every sponsorship", "Section 18A tax certificates"], cta: "Sponsor a learner" }

