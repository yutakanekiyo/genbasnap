export type UserRole = 'admin' | 'manager' | 'member'
export type ProjectStatus = 'active' | 'completed' | 'archived'
export type PhotoStatus = 'pending' | 'analyzed' | 'confirmed'

export interface Organization {
  id: string
  name: string
  logo_url: string | null
  plan: string
  created_at: string
}

export interface User {
  id: string
  org_id: string
  email: string
  name: string
  role: UserRole
  created_at: string
}

export interface Project {
  id: string
  org_id: string
  name: string
  code: string | null
  status: ProjectStatus
  address: string | null
  start_date: string | null
  end_date: string | null
  created_at: string
}

export interface ConstructionType {
  id: string
  project_id: string
  name: string
  sort_order: number
  created_at: string
  parts?: ConstructionPart[]
}

export interface ConstructionPart {
  id: string
  type_id: string
  name: string
  sort_order: number
  created_at: string
}

export interface AIAnalysis {
  construction_type?: {
    id: string | null
    name: string
    confidence: number
  }
  construction_part?: {
    id: string | null
    name: string
    confidence: number
  }
  blackboard?: {
    detected: boolean
    fields: {
      project_name?: string
      construction_type?: string
      location?: string
      date?: string
      contractor?: string
      other?: Record<string, string>
    }
  }
}

export interface Photo {
  id: string
  project_id: string
  type_id: string | null
  part_id: string | null
  storage_path: string
  thumbnail_path: string | null
  original_filename: string | null
  taken_at: string | null
  lat: number | null
  lng: number | null
  description: string | null
  ai_analysis: AIAnalysis
  blackboard_ocr: AIAnalysis['blackboard']
  status: PhotoStatus
  uploaded_by: string | null
  created_at: string
  // JOIN済みフィールド
  construction_type?: ConstructionType
  construction_part?: ConstructionPart
  public_url?: string
}

export interface Schedule {
  id: string
  project_id: string
  type_id: string | null
  name: string
  planned_start: string | null
  planned_end: string | null
  actual_start: string | null
  actual_end: string | null
  progress: number
  sort_order: number
  created_at: string
  construction_type?: ConstructionType
}

export interface LedgerTemplate {
  id: string
  org_id: string
  name: string
  layout_config: Record<string, unknown>
  created_at: string
}
