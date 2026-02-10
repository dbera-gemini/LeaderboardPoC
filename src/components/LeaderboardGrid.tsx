import { useMemo, useRef, useEffect } from 'react'
import { AgGridReact } from 'ag-grid-react'
import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-alpine.css'
import type { Team } from '../types'

function computeMetrics(team: Team) {
  const s = team.series || []
  const n = s.length
  const first = n ? s[0] : 0
  const last = n ? s[n - 1] : 0
  const realized = last - first
  const pnlPct = first !== 0 ? (realized / Math.abs(first)) * 100 : realized * 100
  const totalVolume = team.assets
    ? Object.values(team.assets).reduce((sum, a) => sum + (a.volume || 0), 0)
    : 0

  return { realized, pnlPct, sharpe: team.sharpe, maxDrawdown: team.maxDrawdown, totalVolume }
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

  function onGridReady(params: any) {
    gridApiRef.current = params.api
    columnApiRef.current = params.columnApi
    setTimeout(() => {
      const allCols = params.columnApi.getColumns() || []
      const allColumnIds = allCols
        .map((c: any) => c.getColId())
        .filter((id: string) => !userResizedRef.current.has(id))
      if (allColumnIds.length) params.columnApi.autoSizeColumns(allColumnIds, false)
    }, 0)
  }

  function onColumnResized(params: any) {
    if (params && params.finished) {
      const cols = params.columns || (params.column ? [params.column] : [])
      for (const c of cols) {
        try {
          const id = c.getColId ? c.getColId() : c.colId
          if (id) userResizedRef.current.add(id)
        } catch {
          // ignore
        }
      }
    }
  }

  useEffect(() => {
    if (columnApiRef.current) {
      const colsAll = columnApiRef.current.getColumns() || []
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
        valueFormatter: (p: any) =>
          typeof p.value === 'number' ? (p.value > 0 ? '+' : '') + p.value.toFixed(0) : p.value,
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
        sort: 'desc' as const,
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
      {
        field: 'totalVolume',
        headerName: 'Total Volume',
        valueFormatter: (p: any) =>
          typeof p.value === 'number' ? `$${Math.round(p.value).toLocaleString()}` : p.value,
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
        />
      </div>
    </div>
  )
}
