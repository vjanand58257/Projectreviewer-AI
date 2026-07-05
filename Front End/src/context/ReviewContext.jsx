import React, { createContext, useContext, useState } from "react";

export const ReviewContext = createContext();

export const ReviewProvider = ({ children }) => {
  const [activeReview, setActiveReview] = useState(null);
  const [history, setHistory] = useState([]);

  // Stores real agent results keyed by agent id, e.g. { folder: { score, data, errors } }
  const [agentResults, setAgentResults] = useState({});

  const updateAgentResult = (agentId, result) => {
    setAgentResults((prev) => ({ ...prev, [agentId]: result }));
  };

  const loadReview = (reportData) => {
    setActiveReview(reportData);
    if (reportData && reportData.results) {
      setAgentResults(reportData.results);
    } else {
      setAgentResults({});
    }
  };

  return (
    <ReviewContext.Provider
      value={{
        activeReview,
        setActiveReview,
        history,
        setHistory,
        agentResults,
        setAgentResults,
        updateAgentResult,
        loadReview,
      }}
    >
      {children}
    </ReviewContext.Provider>
  );
};

export const useReview = () => {
  const ctx = useContext(ReviewContext);
  if (!ctx) throw new Error("useReview must be used within a ReviewProvider");
  return ctx;
};

