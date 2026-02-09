import React, { useMemo, useRef, useEffect } from 'react'
import { AgGridReact } from 'ag-grid-react'
import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-alpine.css'

type Team = { id: string; name: string; series: number[]; sharpe?: number; maxDrawdown?: number }

function computeMetrics(team: Team) {
  const s = team.series || []
  const n = s.length
  const first = n ? s[0] : 0
  const last = n ? s[n - 1] : 0
  const realized = last - first
  const pnlPct = first !== 0 ? (realized / Math.abs(first)) * 100 : realized * 100

  if (typeof team.sharpe === 'number' || typeof team.maxDrawdown === 'number') {
    return {
      realized,
      pnlPct,
      sharpe: team.sharpe,
      maxDrawdown: team.maxDrawdown,
    }
  }

  // compute simple sharpe using daily returns over available series
  const returns: number[] = []
  for (let i = 1; i < s.length; i++) {
    const prev = s[i - 1]
    if (prev !== 0) returns.push((s[i] - prev) / Math.abs(prev))
  }
  const mean = returns.reduce((a, b) => a + b, 0) / Math.max(1, returns.length)
  const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / Math.max(1, returns.length)
  const std = Math.sqrt(variance)
  const sharpe = std === 0 ? 0 : (mean / std) * Math.sqrt(Math.max(1, returns.length))

  return { realized, pnlPct, sharpe }
}

export default function LeaderboardGrid({ teams }: { teams: Team[] }) {
  const rowData = useMemo(() => {
    return teams.map((t) => ({
      id: t.id,
      name: t.name,
      series: t.series,
      ...computeMetrics(t),
    }))
  }, [teams])

  const gridApiRef = useRef<any>(null)
  const columnApiRef = useRef<any>(null)
  const userResizedRef = useRef<Set<string>>(new Set())

  // when grid is ready, auto-size columns to fit largest content
  function onGridReady(params: any) {
    gridApiRef.current = params.api
    columnApiRef.current = params.columnApi
    // auto-size after a short tick to ensure rows are rendered
    setTimeout(() => {
      const allCols = params.columnApi.getAllColumns() || []
      const allColumnIds = allCols
        .map((c: any) => c.getColId())
        .filter((id: string) => !userResizedRef.current.has(id))
      if (allColumnIds.length) params.columnApi.autoSizeColumns(allColumnIds, false)
    }, 0)
  }

  function onColumnResized(params: any) {
    // when user finishes a resize, mark that column as user-resized
    if (params && params.finished) {
      const cols = params.columns || (params.column ? [params.column] : [])
      for (const c of cols) {
        try {
          const id = c.getColId ? c.getColId() : c.colId
          if (id) userResizedRef.current.add(id)
        } catch (e) {
          // ignore
        }
      }
    }
  }

  // re-auto-size whenever rowData changes
  useEffect(() => {
    if (columnApiRef.current) {
      const colsAll = columnApiRef.current.getAllColumns() || []
      const cols = colsAll.map((c: any) => c.getColId()).filter((id: string) => !userResizedRef.current.has(id))
      if (cols.length) columnApiRef.current.autoSizeColumns(cols, false)
    }
  }, [rowData])

  const columnDefs = useMemo(
    () => [
      { field: 'name', headerName: 'Team', sortable: true, filter: true, minWidth: 120 },
      {
        field: 'realized',
        headerName: 'Realized P&L',
        valueFormatter: (p: any) => (typeof p.value === 'number' ? (p.value > 0 ? '+' : '') + p.value.toFixed(0) : p.value),
        cellClass: (params: any) => {
          const v = params.value
          if (typeof v === 'number') return v > 0 ? 'cell-positive' : v < 0 ? 'cell-negative' : ''
          return ''
        },
        sortable: true,
        width: 150,
      },
      {
        field: 'pnlPct',
        headerName: 'P&L %',
        valueFormatter: (p: any) => {
          if (typeof p.value !== 'number') return p.value
          const sign = p.value > 0 ? '+' : ''
          const arrow = p.value > 0 ? ' ▲' : p.value < 0 ? ' ▼' : ''
          return `${sign}${p.value.toFixed(2)}%${arrow}`
        },
        cellClass: (params: any) => {
          const v = params.value
          if (typeof v === 'number') return v > 0 ? 'cell-positive' : v < 0 ? 'cell-negative' : ''
          return ''
        },
        sortable: true,
        width: 140,
      },
      {
        field: 'sharpe',
        headerName: 'Sharpe',
        valueFormatter: (p: any) => (typeof p.value === 'number' ? p.value.toFixed(2) : p.value),
        sortable: true,
        width: 120,
      },
      {
        field: 'maxDrawdown',
        headerName: 'Max Drawdown',
        valueFormatter: (p: any) => (typeof p.value === 'number' ? `${p.value.toFixed(2)}%` : p.value),
        sortable: true,
        width: 150,
      },
    ],
    []
  )

  const defaultColDef = useMemo(() => ({ resizable: true, sortable: true, filter: true }), [])

  return (
    <div className="grid-card">
      <div className="ag-theme-alpine" style={{ height: 480, width: '100%' }}>
        <AgGridReact
          rowData={rowData}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          onGridReady={onGridReady}
          onColumnResized={onColumnResized}
          suppressColumnVirtualisation={true}
          sortModel={[{ colId: 'pnlPct', sort: 'desc' }]}
        />
      </div>
    </div>
  )
}
