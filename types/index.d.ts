interface Resume {
    id: string;
    companyName?: string;
    jobTitle?: string;
    imagePath: string;
    resumePath: string;
    feedback: Feedback;
    deterministicATS?: DeterministicATSResult;
}

interface KeywordMatchResult {
    score: number;
    matchedKeywords: string[];
    missingKeywords: string[];
}

interface StructureCheckResult {
    score: number;
    wordCount: number;
    hasEmail: boolean;
    hasPhone: boolean;
    foundSections: string[];
    missingSections: string[];
}

interface DeterministicATSResult {
    overallScore: number;
    keywordMatch: KeywordMatchResult;
    structure: StructureCheckResult;
}

interface NotResumeResponse {
    isResume: false;
    message: string;
}

interface Feedback {
    isResume: true;
    overallScore: number;
    ATS: {
        score: number;
        tips: {
            type: "good" | "improve";
            tip: string;
        }[];
    };
    toneAndStyle: {
        score: number;
        tips: {
            type: "good" | "improve";
            tip: string;
            explanation: string;
        }[];
    };
    content: {
        score: number;
        tips: {
            type: "good" | "improve";
            tip: string;
            explanation: string;
        }[];
    };
    structure: {
        score: number;
        tips: {
            type: "good" | "improve";
            tip: string;
            explanation: string;
        }[];
    };
    skills: {
        score: number;
        tips: {
            type: "good" | "improve";
            tip: string;
            explanation: string;
        }[];
    };
}
