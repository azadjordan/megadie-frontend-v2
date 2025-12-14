import { FaPlus, FaMinus } from 'react-icons/fa'

export default function QuantityControl({ quantity, setQuantity, min = 1 }) {
  const handleChange = (e) => {
    const val = e.target.value
    if (val === '') {
      setQuantity('') // allow clearing
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

  return (
    <div className="flex w-fit overflow-hidden rounded-lg border border-slate-200">
      <button
        type="button"
        onClick={decrement}
        disabled={currentNum <= min}
        aria-label="Decrease quantity"
        title="Decrease quantity"
        className="cursor-pointer bg-slate-100 px-3 text-slate-600 hover:bg-slate-200 hover:text-purple-600 disabled:cursor-not-allowed disabled:opacity-30"
      >
        <FaMinus size={12} />
      </button>

      <input
        type="number"
        min={min}
        value={quantity}
        onChange={handleChange}
        onBlur={handleBlur}
        aria-label="Product quantity"
        title="Product quantity"
        className="no-spinner h-full w-12 bg-white py-1 text-center text-sm font-semibold focus:outline-none"
      />

      <button
        type="button"
        onClick={increment}
        aria-label="Increase quantity"
        title="Increase quantity"
        className="cursor-pointer bg-slate-100 px-3 text-slate-600 hover:bg-slate-200 hover:text-purple-600"
      >
        <FaPlus size={12} />
      </button>
    </div>
  )
}
