/* ------------------------------------------------------------------ */
/*  Operations Hub — Data hook                                        */
/* ------------------------------------------------------------------ */

import { useCallback, useEffect, useState } from 'react'

import { useAuth } from '../auth/AuthProvider'
import {
  fetchOperatingProcedures,
  fetchOperatingProcesses,
  fetchSharedServices,
} from './operationsFetch'
import type { OperatingProcess, OperatingProcedure, SharedService } from './types'

interface OperationsData {
  services: SharedService[]
  processes: OperatingProcess[]
  procedures: OperatingProcedure[]
  loading: boolean
  error: string | null
  refresh: () => void
}

export function useOperations(): OperationsData {
  const { getAccessToken } = useAuth()
  const [services, setServices] = useState<SharedService[]>([])
  const [processes, setProcesses] = useState<OperatingProcess[]>([])
  const [procedures, setProcedures] = useState<OperatingProcedure[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const token = await getAccessToken()
      if (!token) {
        setError('Authentication required')
        setLoading(false)
        return
      }

      const [svcResult, procResult, sopResult] = await Promise.all([
        fetchSharedServices(token),
        fetchOperatingProcesses(token),
        fetchOperatingProcedures(token),
      ])

      setServices(svcResult)
      setProcesses(procResult)
      setProcedures(sopResult)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load operations data')
    } finally {
      setLoading(false)
    }
  }, [getAccessToken])

  useEffect(() => {
    const t = window.setTimeout(() => void load(), 0)
    return () => window.clearTimeout(t)
  }, [load])

  return { services, processes, procedures, loading, error, refresh: load }
}
