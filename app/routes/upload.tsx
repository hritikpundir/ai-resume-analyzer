import { type FormEvent, useState } from "react";
import Navbar from "~/components/Navbar";
import FileUploader from "~/components/FileUploader";
import { usePuterStore } from "~/lib/puter";
import { useNavigate } from "react-router";
import { convertPdfToImage, extractPdfText } from "~/lib/pdf2img";
import { calculateDeterministicATS } from "~/lib/atsScore";
import { generateUUID } from "~/lib/utils";
import { prepareInstructions } from "../../constants";

const cleanJson = (text: string) => {
  // Remove markdown code fences if the AI added them anyway
  return text
    .replace(/^```json\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
};

const isValidFeedback = (obj: any): obj is Feedback => {
  return (
    obj &&
    obj.isResume === true &&
    typeof obj.overallScore === "number" &&
    obj.ATS && obj.toneAndStyle && obj.content && obj.structure && obj.skills
  );
};

const isNotResumeResponse = (obj: any): obj is NotResumeResponse => {
  return obj && obj.isResume === false && typeof obj.message === "string";
};

// Waits until an uploaded file is actually readable from Puter storage,
// retrying a few times with short delays, since upload confirmation
// doesn't always mean the file is instantly fetchable elsewhere.
const waitUntilFileIsReady = async (
  fsRead: (path: string) => Promise<Blob | undefined>,
  path: string,
  maxAttempts = 5,
  delayMs = 1000
): Promise<boolean> => {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const blob = await fsRead(path);
      if (blob && blob.size > 0) {
        return true; // file is confirmed readable and non-empty
      }
    } catch (err) {
      console.warn(`File not ready yet (attempt ${attempt}):`, err);
    }

    // Wait a bit before trying again, instead of hammering it instantly
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  return false; // gave up after maxAttempts
};


const Upload = () => {
  const { auth, isLoading, fs, ai, kv } = usePuterStore();
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const handleFileSelect = (file: File | null) => {
    setFile(file);
  };

  const handleTryAgain = () => {
    setErrorMessage("");
    setFile(null);
    setStatusText("");
  };

  const handleAnalyze = async ({
    companyName,
    jobTitle,
    jobDescription,
    file,
  }: {
    companyName: string;
    jobTitle: string;
    jobDescription: string;
    file: File;
  }) => {
    setErrorMessage("");
    setIsProcessing(true);

    setStatusText("Uploading the file...");
    const uploadedFile = await fs.upload([file]);
    if (!uploadedFile) return setStatusText("Error: Failed to upload file");

    setStatusText("Confirming upload...");
    const isFileReady = await waitUntilFileIsReady(fs.read, uploadedFile.path);
    if (!isFileReady) {
      setErrorMessage(
        "Your file was uploaded but isn't ready to be read yet. Please try again in a moment."
      );
      setIsProcessing(false);
      return;
    }

    setStatusText("Converting to image...");

    const imageFile = await convertPdfToImage(file);
    if (!imageFile.file) {
      console.error("PDF ERROR:", imageFile.error);

      return setStatusText(
        imageFile.error || "Error: Failed to convert PDF to image",
      );
    }
    setStatusText("Uploading the image...");
    const uploadedImage = await fs.upload([imageFile.file]);
    if (!uploadedImage) return setStatusText("Error: Failed to upload image");

    setStatusText("Reading resume content...");
    const resumeText = await extractPdfText(file);
    console.log("EXTRACTED RESUME TEXT LENGTH:", resumeText.length);

   setStatusText("Running deterministic ATS checks...");
    const deterministicATS = calculateDeterministicATS(resumeText, jobDescription);
    console.log("DETERMINISTIC ATS:", deterministicATS);

    setStatusText("Preparing data...");
    const uuid = generateUUID();
    const data: {
      id: string;
      resumePath: string;
      imagePath: string;
      companyName: string;
      jobTitle: string;
      jobDescription: string;
      feedback: string | Feedback;
      deterministicATS: DeterministicATSResult;
    } = {
      id: uuid,
      resumePath: uploadedFile.path,
      imagePath: uploadedImage.path,
      companyName,
      jobTitle,
      jobDescription,
      feedback: "",
      deterministicATS,
    };

    await kv.set(`resume:${uuid}`, JSON.stringify(data));

    setStatusText("Analyzing...");

    console.log("uploadedFile.path:", uploadedFile.path);
    console.log(
      "instructions:",
      prepareInstructions({ jobTitle, jobDescription, resumeText }),
    );


   let feedback;

    try {
      feedback = await ai.feedback(
        uploadedImage.path,
        prepareInstructions({ jobTitle, jobDescription, resumeText }),
      );
    } catch (err) {
      console.error("AI FEEDBACK ERROR:", err);
      setErrorMessage(`AI Error: ${JSON.stringify(err)}`);
      setIsProcessing(false);
      return;
    }

    console.log("RAW AI RESPONSE:", feedback);

    if (!feedback) return setStatusText("Error: Failed to analyze resume");

    const feedbackText =
      typeof feedback.message.content === "string"
        ? feedback.message.content
        : feedback.message.content[0].text;

    console.log("FEEDBACK TEXT:", feedbackText);

    try {
      const parsed = JSON.parse(cleanJson(feedbackText));

      if (isNotResumeResponse(parsed)) {
        console.log("NOT A RESUME:", parsed.message);
        setErrorMessage(
          `This doesn't look like a resume. ${parsed.message} Please upload a resume PDF.`
        );
        setIsProcessing(false);
        return;
      }

      if (!isValidFeedback(parsed)) {
        console.error("INVALID FEEDBACK SHAPE:", parsed);
        setStatusText("Error: AI response was incomplete. Please try again.");
        setIsProcessing(false);
        return;
      }

      data.feedback = parsed;
      console.log("PARSED FEEDBACK:", data.feedback);
    } catch (err) {
      console.error("JSON PARSE ERROR:", err);
      console.log("RAW TEXT:", feedbackText);
      setStatusText("Error: AI returned an unexpected format. Please try again.");
      setIsProcessing(false);
      return;
    }

    
    await kv.set(`resume:${uuid}`, JSON.stringify(data));
    setStatusText("Analysis complete, redirecting...");
    console.log(data);
    navigate(`/resume/${uuid}`);
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget.closest("form");
    if (!form) return;
    const formData = new FormData(form);

    const companyName = formData.get("company-name") as string;
    const jobTitle = formData.get("job-title") as string;
    const jobDescription = formData.get("job-description") as string;

    if (!file) return;

    handleAnalyze({ companyName, jobTitle, jobDescription, file });
  };

  return (
    <main className="bg-[url('/images/bg-main.svg')] bg-cover">
      <Navbar />

      <section className="main-section">
        <div className="page-heading py-16">
          <h1>Smart feedback for your dream job</h1>
          {isProcessing ? (
            <>
              <h2>{statusText}</h2>
              <img src="/images/resume-scan.gif" className="w-full" />
            </>
          ) : errorMessage ? (
            <div className="flex flex-col items-center gap-4">
              <h2 className="!text-red-600 italic">{errorMessage}</h2>
              <button
                type="button"
                onClick={handleTryAgain}
                className="primary-button w-fit"
              >
                Try Again
              </button>
            </div>
          ) : (
            <h2>Drop your resume for an ATS score and improvement tips</h2>
          )}
          
          {!isProcessing && (
            <form
              id="upload-form"
              onSubmit={handleSubmit}
              className="flex flex-col gap-4 mt-8"
            >
              <div className="form-div">
                <label htmlFor="company-name">Company Name</label>
                <input
                  type="text"
                  name="company-name"
                  placeholder="Company Name"
                  id="company-name"
                />
              </div>
              <div className="form-div">
                <label htmlFor="job-title">Job Title</label>
                <input
                  type="text"
                  name="job-title"
                  placeholder="Job Title"
                  id="job-title"
                />
              </div>
              <div className="form-div">
                <label htmlFor="job-description">Job Description</label>
                <textarea
                  rows={5}
                  name="job-description"
                  placeholder="Job Description"
                  id="job-description"
                />
              </div>

              <div className="form-div">
                <label htmlFor="uploader">Upload Resume</label>
                <FileUploader onFileSelect={handleFileSelect} />
              </div>

              <button className="primary-button" type="submit">
                Analyze Resume
              </button>
            </form>
          )}
        </div>
      </section>
    </main>
  );
};
export default Upload;
