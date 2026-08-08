import { ShieldAlert, Shield, Award, Star, Trophy, Crown, Flame } from 'lucide-react'
import type { ElementType } from 'react'

export const RANK_ICONS: Record<string, ElementType> = {
  Bronze: ShieldAlert,
  Silver: Shield,
  Gold: Award,
  Platinum: Star,
  Diamond: Trophy,
  Master: Crown,
  Challenger: Flame,
}

export const RANK_COLORS: Record<string, string> = {
  Bronze: 'text-[#cd7f32]',
  Silver: 'text-[#aaa9ad]',
  Gold: 'text-[#ffd700]',
  Platinum: 'text-[#e5e4e2]',
  Diamond: 'text-[#b9f2ff]',
  Master: 'text-[#ff8c00]',
  Challenger: 'text-[#ff0000]',
}

export const RANK_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  Bronze:   { color: '#cd7f32', bg: 'rgba(205,127,50,0.12)',  label: 'Đồng' },
  Silver:   { color: '#aaa9ad', bg: 'rgba(170,169,173,0.12)', label: 'Bạc' },
  Gold:     { color: '#ffd700', bg: 'rgba(255,215,0,0.12)',   label: 'Vàng' },
  Platinum: { color: '#e5e4e2', bg: 'rgba(229,228,226,0.12)', label: 'Bạch Kim' },
  Diamond:  { color: '#b9f2ff', bg: 'rgba(185,242,255,0.12)', label: 'Kim Cương' },
  Master:   { color: '#ff8c00', bg: 'rgba(255,140,0,0.12)',   label: 'Cao Thủ' },
  Challenger: { color: '#ff0000', bg: 'rgba(255,0,0,0.12)',   label: 'Thách Đấu' },
}
