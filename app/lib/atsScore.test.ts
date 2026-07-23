import { describe, it, expect } from "vitest";
import { calculateKeywordMatch, analyzeStructure, calculateDeterministicATS } from "./atsScore";

describe("calculateKeywordMatch", () => {
  it("returns a 0 score when no job description is provided", () => {
    const result = calculateKeywordMatch("React developer with 3 years experience", "");
    expect(result.score).toBe(0);
    expect(result.matchedKeywords).toEqual([]);
  });

  it("matches keywords that appear in both resume and job description", () => {
    const resumeText = "Experienced React developer skilled in TypeScript and Node.js";
    const jobDescription = "Looking for a React developer with TypeScript experience";

    const result = calculateKeywordMatch(resumeText, jobDescription);

    expect(result.matchedKeywords).toContain("react");
    expect(result.matchedKeywords).toContain("typescript");
    expect(result.score).toBeGreaterThan(0);
  });

  it("lists job description keywords missing from the resume", () => {
    const resumeText = "Frontend developer with HTML and CSS experience";
    const jobDescription = "Must know Python and Django for this backend role";

    const result = calculateKeywordMatch(resumeText, jobDescription);

    expect(result.missingKeywords).toContain("python");
    expect(result.missingKeywords).toContain("django");
  });

  it("gives a perfect score when all keywords are present", () => {
    const jobDescription = "React TypeScript";
    const resumeText = "I am skilled in React and TypeScript development";

    const result = calculateKeywordMatch(resumeText, jobDescription);

    expect(result.score).toBe(100);
    expect(result.missingKeywords).toEqual([]);
  });
});

describe("analyzeStructure", () => {
  it("detects a valid email address", () => {
    const result = analyzeStructure("Contact me at hritik@example.com for more info.");
    expect(result.hasEmail).toBe(true);
  });

  it("reports no email when none is present", () => {
    const result = analyzeStructure("This resume has no contact details at all.");
    expect(result.hasEmail).toBe(false);
  });

  it("detects a phone number with at least 10 digits", () => {
    const result = analyzeStructure("Reach me at +91-8449931204 anytime.");
    expect(result.hasPhone).toBe(true);
  });

  it("penalizes very short resumes", () => {
    const result = analyzeStructure("Short resume text.");
    expect(result.score).toBeLessThan(100);
    expect(result.wordCount).toBeLessThan(150);
  });

  it("recognizes a standalone section header line but not an incidental mention", () => {
    const withRealHeader = "EDUCATION\nBachelor of Engineering, 2023-2027";
    const withIncidentalMention = "I have hands-on experience in software development.";

    const realHeaderResult = analyzeStructure(withRealHeader);
    const incidentalResult = analyzeStructure(withIncidentalMention);

    expect(realHeaderResult.foundSections).toContain("education");
    expect(incidentalResult.foundSections).not.toContain("experience");
  });
});

describe("calculateDeterministicATS", () => {
  it("combines keyword and structure scores into one overall score", () => {
    const resumeText =
      "EDUCATION\nB.E. Information Technology\n\nSKILLS\nReact TypeScript Node.js\n\nContact: test@example.com, +91-8449931204";
    const jobDescription = "Looking for a React and TypeScript developer";

    const result = calculateDeterministicATS(resumeText, jobDescription);

    expect(result.overallScore).toBeGreaterThan(0);
    expect(result.overallScore).toBeLessThanOrEqual(100);
    expect(result.keywordMatch).toBeDefined();
    expect(result.structure).toBeDefined();
  });
});