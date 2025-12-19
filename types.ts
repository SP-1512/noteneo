
export interface Education {
  college: string;
  branch: string;
  year: string; // "1st Year", "2nd Year", etc. or Graduation Year
  graduated?: boolean;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  bannerURL?: string;
  linkedinURL?: string;
  role: 'student' | 'admin';
  bio?: string;
  education?: Education;
  followersCount?: number;
  followingCount?: number;
  // Gamification
  points?: number;
  badges?: string[]; // 'Contributor', 'Helper', 'Expert'
  level?: number;
}

export interface Flashcard {
  q: string;
  a: string;
  confidence?: number;
}

export interface QuizQuestion {
  id: string;
  question: string;
  choices: string[];
  answerIndex: number; // 0-3
  explanation: string;
}

export interface Quiz {
  id: string;
  title: string;
  questions: QuizQuestion[];
}

export interface QualityAssessment {
  score: number; // 1-10
  clarity: string;
  completeness: string;
  relevance: string;
  legibility: string;
}

export interface NoteError {
  hasErrors: boolean;
  warnings: string[]; // "Page 2 is blurry", etc.
}

export interface NoteAI {
  contentHash?: string;
  summary?: {
    text: string;
    keyPoints: string[];
    length: 'short' | 'medium' | 'long';
    generatedAt: string;
  };
  flashcards?: Flashcard[];
  quizzes?: Quiz[];
  explanations?: Array<{
    id: string;
    selectionRange: { start: number; end: number };
    text: string;
    example: string;
    generatedAt: string;
  }>;
  processedBy?: string;
  // New Fields
  quality?: QualityAssessment;
  errors?: NoteError;
}

export interface CoAuthor {
  uid: string;
  displayName: string;
  email: string;
}

export interface Note {
  id: string;
  serialNumber?: string; // Unique human-readable ID (e.g., NB-A1B2C)
  title: string;
  subject: string;
  semester: string;
  tags: string[];
  uploaderId: string;
  uploaderIds: string[]; // For querying notes by any author
  uploaderName: string;
  coAuthors?: CoAuthor[]; // Display info
  fileURL: string;
  fileType: string; // 'application/pdf' or image mime type
  storageProvider?: 'firebase' | 'google_drive';
  uploadDate: string;
  ai?: NoteAI;
  copyrightStatus?: 'original' | 'infringing' | 'under_review';
  originalNoteId?: string; // Link to the original if marked infringing
}

export interface UserProgress {
  flashcards: Record<string, { known: number[]; unknown: number[]; lastReviewed: string }>;
  quizzes: Record<string, { score: number; answeredAt: string }>;
}