export default function ErrorMessage({
  message,
  error,
  className = "",
}) {
  let resolvedMessage =
    message ||
    error?.data?.message ||
    error?.error ||
    error?.message ||
    "Something went wrong.";
  if (
    resolvedMessage ===
    "Cannot confirm while there is a shortage. Please accept the shortage or update quantities."
  ) {
    resolvedMessage =
      "Cannot confirm while there is a shortage. Please confirm or update quantities.";
  }
  return (
    <div
      className={[
        "rounded border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700",
        className,
      ].join(" ")}
    >
      {resolvedMessage}
    </div>
  )
}
