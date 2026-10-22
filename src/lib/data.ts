export type Field =
  | "Finance"
  | "Law"
  | "Engineering"
  | "Technology"
  | "Healthcare"
  | "Creative"
  | "Science"
  | "Business";

export interface Role {
  slug: string;
  title: string;
  field: Field;
  summary: string;
  subjects: string[];
  formats: ("In-person" | "Digital")[];
  studyPath: string;
}

export const FIELDS: Field[] = [
  "Finance",
  "Law",
  "Engineering",
  "Technology",
  "Healthcare",
  "Creative",
  "Science",
  "Business",
];

export const ROLES: Role[] = [
  { slug: "chartered-accountant", title: "Chartered Accountant (CA)", field: "Finance", summary: "Audit companies, advise on tax and help businesses make sound financial decisions.", subjects: ["Mathematics", "Accounting", "English"], formats: ["In-person", "Digital"], studyPath: "BCom Accounting → CTA → SAICA articles" },
  { slug: "actuary", title: "Actuary", field: "Finance", summary: "Use statistics and maths to measure risk for insurers, banks and pension funds.", subjects: ["Mathematics (70%+)", "Physical Sciences", "English"], formats: ["Digital"], studyPath: "BSc Actuarial Science" },
  { slug: "investment-banker", title: "Investment Analyst", field: "Finance", summary: "Research companies and markets to guide investment decisions.", subjects: ["Mathematics", "Economics", "English"], formats: ["In-person", "Digital"], studyPath: "BCom Finance / Economics → CFA" },
  { slug: "attorney", title: "Attorney", field: "Law", summary: "Represent clients, draft contracts and argue matters in court.", subjects: ["English", "History", "A second language"], formats: ["In-person", "Digital"], studyPath: "LLB → articles → board exams" },
  { slug: "advocate", title: "Advocate", field: "Law", summary: "Specialist litigator who argues cases in the High Court on behalf of attorneys.", subjects: ["English", "History"], formats: ["In-person"], studyPath: "LLB → pupillage at the Bar" },
  { slug: "civil-engineer", title: "Civil Engineer", field: "Engineering", summary: "Design and build roads, bridges, dams and water systems.", subjects: ["Mathematics", "Physical Sciences", "EGD"], formats: ["In-person"], studyPath: "BEng / BSc Eng Civil" },
  { slug: "mechanical-engineer", title: "Mechanical Engineer", field: "Engineering", summary: "Design machines, engines and manufacturing systems.", subjects: ["Mathematics", "Physical Sciences"], formats: ["In-person", "Digital"], studyPath: "BEng Mechanical" },
  { slug: "electrical-engineer", title: "Electrical Engineer", field: "Engineering", summary: "Work on power grids, renewable energy and electronic systems.", subjects: ["Mathematics", "Physical Sciences"], formats: ["In-person"], studyPath: "BEng Electrical / Electronic" },
  { slug: "software-developer", title: "Software Developer", field: "Technology", summary: "Build apps, websites and systems that millions of people use.", subjects: ["Mathematics", "IT / CAT"], formats: ["In-person", "Digital"], studyPath: "BSc Computer Science / bootcamp" },
  { slug: "data-scientist", title: "Data Scientist", field: "Technology", summary: "Turn data into insights using statistics and machine learning.", subjects: ["Mathematics", "IT"], formats: ["Digital"], studyPath: "BSc Statistics / Computer Science" },
  { slug: "cyber-security", title: "Cybersecurity Analyst", field: "Technology", summary: "Protect organisations from hackers and data breaches.", subjects: ["Mathematics", "IT"], formats: ["Digital"], studyPath: "BSc IT / Computer Science + certifications" },
  { slug: "medical-doctor", title: "Medical Doctor", field: "Healthcare", summary: "Diagnose and treat patients in hospitals and clinics.", subjects: ["Mathematics", "Physical Sciences", "Life Sciences"], formats: ["In-person", "Digital"], studyPath: "MBChB (6 years) → internship → community service" },
  { slug: "physiotherapist", title: "Physiotherapist", field: "Healthcare", summary: "Help people recover movement after injury or illness.", subjects: ["Life Sciences", "Physical Sciences", "Mathematics"], formats: ["In-person"], studyPath: "BSc Physiotherapy" },
  { slug: "pharmacist", title: "Pharmacist", field: "Healthcare", summary: "Dispense medicines and advise patients on safe use.", subjects: ["Mathematics", "Physical Sciences", "Life Sciences"], formats: ["In-person", "Digital"], studyPath: "BPharm → internship" },
  { slug: "architect", title: "Architect", field: "Creative", summary: "Design buildings and spaces that shape how communities live.", subjects: ["Mathematics", "EGD", "Visual Arts"], formats: ["In-person"], studyPath: "BArch / BAS → Master of Architecture" },
  { slug: "graphic-designer", title: "Graphic Designer", field: "Creative", summary: "Create brands, campaigns and visual stories.", subjects: ["Visual Arts", "Design", "English"], formats: ["In-person", "Digital"], studyPath: "Diploma / BA Visual Communication" },
  { slug: "journalist", title: "Journalist", field: "Creative", summary: "Investigate, write and broadcast stories that matter.", subjects: ["English", "History", "A second language"], formats: ["Digital"], studyPath: "BA Journalism / Media Studies" },
  { slug: "biotechnologist", title: "Biotechnologist", field: "Science", summary: "Use biology to develop medicines, crops and sustainable materials.", subjects: ["Life Sciences", "Physical Sciences", "Mathematics"], formats: ["In-person"], studyPath: "BSc Biotechnology / Microbiology" },
  { slug: "environmental-scientist", title: "Environmental Scientist", field: "Science", summary: "Study ecosystems and help protect South Africa's natural heritage.", subjects: ["Geography", "Life Sciences", "Mathematics"], formats: ["In-person", "Digital"], studyPath: "BSc Environmental Science" },
  { slug: "marketing-manager", title: "Marketing Manager", field: "Business", summary: "Understand customers and build campaigns that grow brands.", subjects: ["English", "Business Studies"], formats: ["In-person", "Digital"], studyPath: "BCom Marketing" },
  { slug: "entrepreneur", title: "Entrepreneur", field: "Business", summary: "Start and run your own business, solving real problems.", subjects: ["Business Studies", "Accounting", "Mathematics"], formats: ["Digital"], studyPath: "Any degree — or straight into building" },
];

export const PROVINCES = [
  "Eastern Cape", "Free State", "Gauteng", "KwaZulu-Natal", "Limpopo",
  "Mpumalanga", "North West", "Northern Cape", "Western Cape",
];

export const STATUSES = ["Submitted", "Under Review", "Host Matched", "Date Confirmed", "Completed"] as const;
export type Status = (typeof STATUSES)[number];
