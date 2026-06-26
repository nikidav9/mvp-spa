import { useState, useEffect, useMemo } from 'react'

interface DayRecord {
  date: string
  orders: number
  hours: number
  iph: number
}

const STORES = [
  { key: 'slavyansky', name: 'Славянский бул. 5к1' },
  { key: 'tallinskaya', name: 'Таллинская 14' },
  { key: 'pyatnitskaya', name: 'Пятницкая 11' },
  { key: 'vasilevskogo', name: 'Васильевского 17' },
]

const SELECTED_STORE_KEY = 'warehouse_selected_store'
const recordsKey = (store: string) => `warehouse_iph_records_${store}`
const planKey = (store: string) => `warehouse_iph_plan_${store}`

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function formatDate(dateStr: string): string {
  const [y, m, day] = dateStr.split('-')
  return `${day}.${m}.${y}`
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number): number {
  const d = new Date(year, month, 1).getDay()
  return d === 0 ? 6 : d - 1
}

function iphColor(iph: number): string {
  if (iph >= 50) return '#22c55e'
  if (iph >= 30) return '#f59e0b'
  return '#ef4444'
}

function avgColor(avg: number, plan: number): string {
  if (avg >= plan) return '#22c55e'
  if (avg >= plan - 10) return '#f59e0b'
  return '#ef4444'
}

function loadRecords(store: string): DayRecord[] {
  try {
    const raw = localStorage.getItem(recordsKey(store))
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function loadPlan(store: string): number | null {
  const v = localStorage.getItem(planKey(store))
  return v ? parseFloat(v) : null
}

export default function App() {
  const [selectedStore, setSelectedStore] = useState(() =>
    localStorage.getItem(SELECTED_STORE_KEY) || STORES[0].key
  )

  const [records, setRecords] = useState<DayRecord[]>(() => loadRecords(selectedStore))

  const today = toDateStr(new Date())
  const [date, setDate] = useState(today)
  const [orders, setOrders] = useState('')
  const [hours, setHours] = useState('')
  const [shiftHoursInput, setShiftHoursInput] = useState('')
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  const [plan, setPlan] = useState<number | null>(() => loadPlan(selectedStore))
  const [planInput, setPlanInput] = useState(() => {
    const v = localStorage.getItem(planKey(selectedStore))
    return v ?? ''
  })
  const [editingPlan, setEditingPlan] = useState(false)

  const [calYear, setCalYear] = useState(() => new Date().getFullYear())
  const [calMonth, setCalMonth] = useState(() => new Date().getMonth())

  // Switch store: reload records and plan
  function switchStore(key: string) {
    setSelectedStore(key)
    localStorage.setItem(SELECTED_STORE_KEY, key)
    setRecords(loadRecords(key))
    const p = loadPlan(key)
    setPlan(p)
    setPlanInput(p !== null ? String(p) : '')
    setEditingPlan(false)
    setOrders('')
    setHours('')
    setShiftHoursInput('')
    setError('')
    setDate(today)
  }

  useEffect(() => {
    localStorage.setItem(recordsKey(selectedStore), JSON.stringify(records))
  }, [records, selectedStore])

  function savePlan() {
    const v = parseFloat(planInput)
    if (v > 0) {
      setPlan(v)
      localStorage.setItem(planKey(selectedStore), String(v))
    } else {
      setPlan(null)
      localStorage.removeItem(planKey(selectedStore))
    }
    setEditingPlan(false)
  }

  const avg = useMemo(() => {
    if (records.length === 0) return null
    return records.reduce((s, r) => s + r.iph, 0) / records.length
  }, [records])

  const recordMap = useMemo(() => {
    const m: Record<string, DayRecord> = {}
    for (const r of records) m[r.date] = r
    return m
  }, [records])

  const shiftHours = parseFloat(shiftHoursInput) || 0

  const totalHours = useMemo(() => {
    const h = parseFloat(hours) || 0
    return h + shiftHours
  }, [hours, shiftHours])

  const previewIph = useMemo(() => {
    const o = parseFloat(orders)
    if (o > 0 && totalHours > 0) return o / totalHours
    return null
  }, [orders, totalHours])

  function handleSave() {
    const o = parseFloat(orders)
    if (!date) { setError('Укажите дату'); return }
    if (!o || o <= 0) { setError('Укажите количество штучек'); return }
    if (totalHours <= 0) { setError('Укажите рабочее время'); return }
    setError('')
    const iph = o / totalHours
    setRecords(prev => {
      const filtered = prev.filter(r => r.date !== date)
      return [...filtered, { date, orders: o, hours: totalHours, iph }].sort((a, b) => a.date.localeCompare(b.date))
    })
    setOrders('')
    setHours('')
    setShiftHoursInput('')
    setDate(today)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function handleDelete(dateStr: string) {
    setRecords(prev => prev.filter(r => r.date !== dateStr))
  }

  const daysInMonth = getDaysInMonth(calYear, calMonth)
  const firstDay = getFirstDayOfMonth(calYear, calMonth)

  const monthNames = ['Январь','Февраль','Март','Апрель','Май','Июнь',
    'Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь']
  const dayNames = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс']

  function prevMonth() {
    if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11) }
    else setCalMonth(m => m - 1)
  }
  function nextMonth() {
    if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0) }
    else setCalMonth(m => m + 1)
  }

  const sortedRecords = [...records].sort((a, b) => b.date.localeCompare(a.date))
  const storeName = STORES.find(s => s.key === selectedStore)?.name ?? ''

  return (
    <div className="app">
      <header className="header">
        <div className="header-inner">
          <h1>📦 IPH Калькулятор склада</h1>
          <p className="subtitle">IPH = Штучки за день / Рабочее время</p>
        </div>
      </header>

      <div className="store-bar">
        <div className="store-bar-inner">
          {STORES.map(s => (
            <button
              key={s.key}
              className={`store-tab${selectedStore === s.key ? ' active' : ''}`}
              onClick={() => switchStore(s.key)}
            >
              {s.name}
            </button>
          ))}
        </div>
      </div>

      <main className="main">
        <div className="grid-layout">
          <div className="left-col">
            {avg !== null && (
              <div className="avg-card">
                <div className="avg-label">Средний IPH · {storeName}</div>
                <div className="avg-value" style={{ color: plan !== null ? avgColor(avg, plan) : iphColor(avg) }}>
                  {avg.toFixed(1)}
                </div>
                <div className="avg-sub">за {records.length} {records.length === 1 ? 'день' : records.length < 5 ? 'дня' : 'дней'}</div>
                <div className="plan-divider" />
                <div className="plan-row">
                  <span className="plan-label">План</span>
                  {editingPlan ? (
                    <input
                      className="plan-input"
                      type="number"
                      min="1"
                      step="0.1"
                      autoFocus
                      value={planInput}
                      onChange={e => setPlanInput(e.target.value)}
                      onBlur={savePlan}
                      onKeyDown={e => { if (e.key === 'Enter') savePlan(); if (e.key === 'Escape') setEditingPlan(false) }}
                    />
                  ) : (
                    <button className="plan-value" onClick={() => setEditingPlan(true)}>
                      {plan !== null ? plan.toFixed(1) : <span className="plan-empty">нажми чтобы задать</span>}
                    </button>
                  )}
                </div>
                {plan !== null && avg !== null && (
                  <div className="plan-diff" style={{ color: avgColor(avg, plan) }}>
                    {avg >= plan ? `+${(avg - plan).toFixed(1)} выше плана` : `${(avg - plan).toFixed(1)} ниже плана`}
                  </div>
                )}
              </div>
            )}

            <div className="card form-card">
              <h2>Добавить запись</h2>
              <div className="form-group">
                <label>Дата</label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} max={today} />
              </div>
              <div className="form-group">
                <label>Количество штучек</label>
                <input
                  type="number"
                  min="1"
                  placeholder="например, 150"
                  value={orders}
                  onChange={e => setOrders(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Рабочее время Яндекс Смены <span className="label-hint">(необязательно)</span></label>
                <input
                  type="number"
                  min="0.5"
                  step="0.5"
                  placeholder="например, 9"
                  value={shiftHoursInput}
                  onChange={e => setShiftHoursInput(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Рабочее время (часы штатных сотрудников)</label>
                <input
                  type="number"
                  min="0.5"
                  step="0.5"
                  placeholder="например, 8"
                  value={hours}
                  onChange={e => setHours(e.target.value)}
                />
              </div>
              {shiftHours > 0 && (parseFloat(hours) || 0) > 0 && (
                <div className="total-hours">
                  Итого часов: <strong>{totalHours}</strong>
                </div>
              )}
              {previewIph !== null && (
                <div className="preview-iph">
                  IPH = <strong style={{ color: plan !== null ? avgColor(previewIph, plan) : iphColor(previewIph) }}>{previewIph.toFixed(1)}</strong>
                </div>
              )}
              {error && <div className="error">{error}</div>}
              <button className="btn-save" onClick={handleSave}>
                {saved ? '✓ Сохранено!' : 'Сохранить'}
              </button>
              {recordMap[date] && (
                <div className="existing-note">
                  Запись за {formatDate(date)} уже есть — будет перезаписана
                </div>
              )}
            </div>
          </div>

          <div className="right-col">
            <div className="card calendar-card">
              <div className="cal-header">
                <button className="cal-nav" onClick={prevMonth}>‹</button>
                <span className="cal-title">{monthNames[calMonth]} {calYear}</span>
                <button className="cal-nav" onClick={nextMonth}>›</button>
              </div>
              <div className="cal-grid">
                {dayNames.map(d => (
                  <div key={d} className="cal-day-name">{d}</div>
                ))}
                {Array.from({ length: firstDay }).map((_, i) => (
                  <div key={`empty-${i}`} className="cal-cell empty" />
                ))}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1
                  const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                  const rec = recordMap[dateStr]
                  const isToday = dateStr === today
                  const isSelected = dateStr === date
                  const color = rec ? (plan !== null ? avgColor(rec.iph, plan) : iphColor(rec.iph)) : null
                  return (
                    <div
                      key={dateStr}
                      className={`cal-cell clickable${rec ? ' has-data' : ''}${isToday ? ' today' : ''}${isSelected ? ' selected' : ''}`}
                      title={rec ? `${formatDate(dateStr)}: ${rec.orders} шт / ${rec.hours}ч = IPH ${rec.iph.toFixed(1)}` : `Добавить запись за ${formatDate(dateStr)}`}
                      onClick={() => setDate(dateStr)}
                      style={rec ? { background: color + '22', borderColor: color + '66' } : undefined}
                    >
                      <span className="cal-day-num">{day}</span>
                      {rec && (
                        <span className="cal-iph" style={{ color: color! }}>
                          {rec.iph.toFixed(1)}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        {sortedRecords.length > 0 && (
          <div className="card table-card">
            <h2>История по дням — {storeName}</h2>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Дата</th>
                    <th>Штучек</th>
                    <th>Часов</th>
                    <th>IPH</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {sortedRecords.map(r => (
                    <tr key={r.date}>
                      <td>{formatDate(r.date)}</td>
                      <td>{r.orders}</td>
                      <td>{r.hours}</td>
                      <td>
                        <span className="iph-badge" style={{ background: (plan !== null ? avgColor(r.iph, plan) : iphColor(r.iph)) + '22', color: plan !== null ? avgColor(r.iph, plan) : iphColor(r.iph) }}>
                          {r.iph.toFixed(1)}
                        </span>
                      </td>
                      <td>
                        <button className="btn-delete" onClick={() => handleDelete(r.date)} title="Удалить">✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
