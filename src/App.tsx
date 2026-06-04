import { useState, useEffect, useMemo } from 'react'

interface DayRecord {
  date: string
  orders: number
  hours: number
  iph: number
}

const STORAGE_KEY = 'warehouse_iph_records'
const PLAN_KEY = 'warehouse_iph_plan'

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
  let d = new Date(year, month, 1).getDay()
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

export default function App() {
  const [records, setRecords] = useState<DayRecord[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      return raw ? JSON.parse(raw) : []
    } catch {
      return []
    }
  })

  const today = toDateStr(new Date())
  const [date, setDate] = useState(today)
  const [orders, setOrders] = useState('')
  const [hours, setHours] = useState('')
  const [shiftStart, setShiftStart] = useState('')
  const [shiftEnd, setShiftEnd] = useState('')
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  function calcShiftHours(start: string, end: string): number | null {
    if (!start || !end) return null
    const [sh, sm] = start.split(':').map(Number)
    const [eh, em] = end.split(':').map(Number)
    let mins = (eh * 60 + em) - (sh * 60 + sm)
    if (mins <= 0) mins += 24 * 60
    return Math.round(mins / 60 * 100) / 100
  }

  function handleShiftChange(start: string, end: string) {
    const h = calcShiftHours(start, end)
    if (h !== null) setHours(String(h))
  }

  const [plan, setPlan] = useState<number | null>(() => {
    const v = localStorage.getItem(PLAN_KEY)
    return v ? parseFloat(v) : null
  })
  const [planInput, setPlanInput] = useState(() => {
    const v = localStorage.getItem(PLAN_KEY)
    return v ? v : ''
  })
  const [editingPlan, setEditingPlan] = useState(false)

  const [calYear, setCalYear] = useState(() => new Date().getFullYear())
  const [calMonth, setCalMonth] = useState(() => new Date().getMonth())

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records))
  }, [records])

  function savePlan() {
    const v = parseFloat(planInput)
    if (v > 0) {
      setPlan(v)
      localStorage.setItem(PLAN_KEY, String(v))
    } else {
      setPlan(null)
      localStorage.removeItem(PLAN_KEY)
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

  const previewIph = useMemo(() => {
    const o = parseFloat(orders)
    const h = parseFloat(hours)
    if (o > 0 && h > 0) return o / h
    return null
  }, [orders, hours])

  function handleSave() {
    const o = parseFloat(orders)
    const h = parseFloat(hours)
    if (!date) { setError('Укажите дату'); return }
    if (!o || o <= 0) { setError('Укажите количество заказов'); return }
    if (!h || h <= 0) { setError('Укажите рабочее время'); return }
    setError('')
    const iph = o / h
    setRecords(prev => {
      const filtered = prev.filter(r => r.date !== date)
      return [...filtered, { date, orders: o, hours: h, iph }].sort((a, b) => a.date.localeCompare(b.date))
    })
    setOrders('')
    setHours('')
    setShiftStart('')
    setShiftEnd('')
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

  return (
    <div className="app">
      <header className="header">
        <div className="header-inner">
          <h1>📦 IPH Калькулятор склада</h1>
          <p className="subtitle">IPH = Заказы за день / Рабочее время</p>
        </div>
      </header>

      <main className="main">
        <div className="grid-layout">
          <div className="left-col">
            {avg !== null && (
              <div className="avg-card">
                <div className="avg-label">Средний IPH</div>
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
                <label>Собрано заказов</label>
                <input
                  type="number"
                  min="1"
                  placeholder="например, 150"
                  value={orders}
                  onChange={e => setOrders(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Яндекс смена <span className="label-hint">(Введите диапазон часов, которую работал сотрудник / была открыта смена)</span></label>
                <div className="shift-row">
                  <input
                    type="time"
                    value={shiftStart}
                    onChange={e => { setShiftStart(e.target.value); handleShiftChange(e.target.value, shiftEnd) }}
                  />
                  <span className="shift-sep">—</span>
                  <input
                    type="time"
                    value={shiftEnd}
                    onChange={e => { setShiftEnd(e.target.value); handleShiftChange(shiftStart, e.target.value) }}
                  />
                  {calcShiftHours(shiftStart, shiftEnd) !== null && (
                    <span className="shift-calc">{calcShiftHours(shiftStart, shiftEnd)} ч</span>
                  )}
                </div>
              </div>
              <div className="form-group">
                <label>Рабочее время (часы)</label>
                <input
                  type="number"
                  min="0.5"
                  step="0.5"
                  placeholder="например, 8"
                  value={hours}
                  onChange={e => setHours(e.target.value)}
                />
              </div>
              {previewIph !== null && (
                <div className="preview-iph">
                  IPH = <strong style={{ color: iphColor(previewIph) }}>{previewIph.toFixed(1)}</strong>
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
                      title={rec ? `${formatDate(dateStr)}: ${rec.orders} заказов / ${rec.hours}ч = IPH ${rec.iph.toFixed(1)}` : `Добавить запись за ${formatDate(dateStr)}`}
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
            <h2>История по дням</h2>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Дата</th>
                    <th>Заказов</th>
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
