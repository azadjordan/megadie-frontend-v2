export default function ErrorMessage({ message = 'Something went wrong.' }) {
  return (
    <div className="rounded border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
      {message}
    </div>
  )
}
