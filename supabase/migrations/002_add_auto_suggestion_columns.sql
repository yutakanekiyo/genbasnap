-- 工種自動提案機能用カラム追加
ALTER TABLE public.construction_types
  ADD COLUMN IF NOT EXISTS auto_added boolean DEFAULT false;

ALTER TABLE public.construction_types
  ADD COLUMN IF NOT EXISTS original_detected_name text;
