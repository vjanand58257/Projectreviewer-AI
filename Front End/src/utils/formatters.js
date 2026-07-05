export const formatPercentage = (value) => {
  if (value === undefined || value === null) return "0%";
  return `${value}%`;
};

export const getSeverityColor = (severity) => {
  switch (severity?.toUpperCase()) {
    case "CRITICAL":
      return "text-red-500 bg-red-950/40 border-red-800";
    case "MAJOR":
      return "text-orange-500 bg-orange-950/40 border-orange-800";
    case "MINOR":
      return "text-yellow-500 bg-yellow-950/40 border-yellow-800";
    default:
      return "text-sky-500 bg-sky-950/40 border-sky-800";
  }
};
