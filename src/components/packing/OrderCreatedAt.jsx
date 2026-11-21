const dateFormat = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Dubai', day: 'numeric', month: 'short', year: 'numeric' });
const timeFormat = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Dubai', hour: 'numeric', minute: '2-digit', hour12: true });

export default function OrderCreatedAt({ value }) {
  const date = value ? new Date(value) : null;
  if (!date || !Number.isFinite(date.getTime())) return null;
  return <p className="mt-1 text-xs leading-5 text-slate-500"><time dateTime={date.toISOString()}>Ordered {dateFormat.format(date)} · {timeFormat.format(date)}</time></p>;
}
