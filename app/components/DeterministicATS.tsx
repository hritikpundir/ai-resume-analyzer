const SubScoreBar = ({ label, score }: { label: string; score: number }) => {
  const barColor = score > 69 ? "bg-green-500" : score > 49 ? "bg-yellow-500" : "bg-red-500";

  return (
    <div className="mb-3">
      <div className="flex justify-between mb-1">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <span className="text-sm font-medium text-gray-700">{score}/100</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full ${barColor}`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
};

const DeterministicATS = ({ result }: { result: DeterministicATSResult }) => {
  const { overallScore, keywordMatch, structure } = result;

  const gradientClass =
    overallScore > 69 ? "from-green-100" : overallScore > 49 ? "from-yellow-100" : "from-red-100";

  return (
    <div className={`bg-gradient-to-b ${gradientClass} to-white rounded-2xl shadow-md w-full p-6`}>
      <div className="flex items-center gap-4 mb-2">
        <h2 className="text-2xl font-bold">Deterministic ATS Score - {overallScore}/100</h2>
      </div>
      <p className="text-gray-600 mb-5">
        Calculated directly by code — no AI involved, so re-running the same resume and
        job description always gives this exact result.
      </p>

      <div className="mb-5">
        <SubScoreBar label="Keyword Match" score={keywordMatch.score} />
        <SubScoreBar label="Resume Structure" score={structure.score} />
      </div>

      {/* Keyword breakdown */}
      {keywordMatch.matchedKeywords.length > 0 && (
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-green-700 mb-2">
            Matched Keywords ({keywordMatch.matchedKeywords.length})
          </h3>
          <div className="flex flex-wrap gap-2">
            {keywordMatch.matchedKeywords.map((word) => (
              <span key={word} className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm">
                {word}
              </span>
            ))}
          </div>
        </div>
      )}

      {keywordMatch.missingKeywords.length > 0 && (
        <div className="mb-5">
          <h3 className="text-lg font-semibold text-amber-700 mb-2">
            Missing Keywords ({keywordMatch.missingKeywords.length})
          </h3>
          <div className="flex flex-wrap gap-2">
            {keywordMatch.missingKeywords.map((word) => (
              <span key={word} className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-sm">
                {word}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Structure breakdown */}
      <div>
        <h3 className="text-lg font-semibold text-gray-700 mb-2">Structure Checks</h3>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className={structure.hasEmail ? "text-green-700" : "text-amber-700"}>
            {structure.hasEmail ? "✓" : "⚠"} Email detected
          </div>
          <div className={structure.hasPhone ? "text-green-700" : "text-amber-700"}>
            {structure.hasPhone ? "✓" : "⚠"} Phone number detected
          </div>
          <div className="text-gray-600">
            Word count: {structure.wordCount}
          </div>
          <div className="text-gray-600">
            Sections found: {structure.foundSections.join(", ") || "none"}
          </div>
        </div>
        {structure.missingSections.length > 0 && (
          <p className="text-amber-700 text-sm mt-2">
            Consider adding clear section headers for: {structure.missingSections.join(", ")}
          </p>
        )}
      </div>
    </div>
  );
};

export default DeterministicATS;