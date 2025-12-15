// src/components/common/QuantityControl.jsx
import { FaPlus, FaMinus } from 'react-icons/fa'

export default function QuantityControl({
  quantity,
  setQuantity,
  min = 1,
  size = 'md', // 'sm' | 'md' | 'lg'
  compact = false, // slightly tighter corners for dense rows
}) {
  const handleChange = (e) => {
    const val = e.target.value
    if (val === '') {
      setQuantity('')
      return
    }
    const parsed = parseInt(val, 10)
    if (Number.isNaN(parsed)) {
      setQuantity('')
      return
    }
    setQuantity(Math.max(parsed, min))
  }

  const handleBlur = () => {
    const parsed = parseInt(quantity, 10)
    if (quantity === '' || Number.isNaN(parsed)) setQuantity(min)
    else if (parsed < min) setQuantity(min)
  }

  const decrement = () => {
    const current = parseInt(quantity, 10) || min
    setQuantity(Math.max(min, current - 1))
  }

  const increment = () => {
    const current = parseInt(quantity, 10) || min
    setQuantity(current + 1)
  }

  const currentNum = parseInt(quantity, 10) || min

  const sizes = {
    sm: { btn: 'px-2', input: 'w-10 text-xs', icon: 10, wrap: 'h-8' },
    md: { btn: 'px-3', input: 'w-12 text-sm', icon: 12, wrap: 'h-9' },
    lg: { btn: 'px-4', input: 'w-14 text-base', icon: 14, wrap: 'h-10' },
  }

  const s = sizes[size] || sizes.md

  return (
    <div
      className={[
        'flex overflow-hidden bg-white ring-1 ring-slate-200',
        'focus-within:ring-2 focus-within:ring-slate-400',
        compact ? 'rounded-md' : 'rounded-lg',
        s.wrap,
      ].join(' ')}
    >
      <button
        type="button"
        onClick={decrement}
        disabled={currentNum <= min}
        aria-label="Decrease quantity"
        title="Decrease quantity"
        className={[
          'bg-slate-100 text-slate-600 transition',
          'hover:bg-slate-200 hover:text-slate-900',
          'disabled:cursor-not-allowed disabled:opacity-30',
          s.btn,
        ].join(' ')}
      >
        <FaMinus size={s.icon} />
      </button>

      <input
        type="number"
        min={min}
        value={quantity}
        onChange={handleChange}
        onBlur={handleBlur}
        aria-label="Product quantity"
        title="Product quantity"
        className={[
          'h-full bg-white py-1 text-center font-semibold text-slate-900 outline-none',
          s.input,
        ].join(' ')}
      />

      <button
        type="button"
        onClick={increment}
        aria-label="Increase quantity"
        title="Increase quantity"
        className={[
          'bg-slate-100 text-slate-600 transition',
          'hover:bg-slate-200 hover:text-slate-900',
          s.btn,
        ].join(' ')}
      >
        <FaPlus size={s.icon} />
      </button>
    </div>
  )
}
