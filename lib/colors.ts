import { CardColor } from '@/types/card'

export const CARD_COLORS: Record<CardColor, { bg: string; border: string; dot: string; label: string }> = {
  red: {
    bg: 'bg-red-50',
    border: 'border-red-200 hover:border-red-400',
    dot: 'bg-red-500',
    label: 'แดง',
  },
  blue: {
    bg: 'bg-blue-50',
    border: 'border-blue-200 hover:border-blue-400',
    dot: 'bg-blue-500',
    label: 'น้ำเงิน',
  },
  green: {
    bg: 'bg-green-50',
    border: 'border-green-200 hover:border-green-400',
    dot: 'bg-green-500',
    label: 'เขียว',
  },
  yellow: {
    bg: 'bg-yellow-50',
    border: 'border-yellow-200 hover:border-yellow-400',
    dot: 'bg-yellow-500',
    label: 'เหลือง',
  },
  purple: {
    bg: 'bg-purple-50',
    border: 'border-purple-200 hover:border-purple-400',
    dot: 'bg-purple-500',
    label: 'ม่วง',
  },
  pink: {
    bg: 'bg-pink-50',
    border: 'border-pink-200 hover:border-pink-400',
    dot: 'bg-pink-500',
    label: 'ชมพู',
  },
  orange: {
    bg: 'bg-orange-50',
    border: 'border-orange-200 hover:border-orange-400',
    dot: 'bg-orange-500',
    label: 'ส้ม',
  },
  gray: {
    bg: 'bg-gray-50',
    border: 'border-gray-200 hover:border-gray-400',
    dot: 'bg-gray-500',
    label: 'เทา',
  },
}

export const DEFAULT_CARD_COLOR: CardColor = 'blue'

const CARD_COLOR_ALIASES: Record<string, CardColor> = {
  grey: 'gray',
}

export const normalizeCardColor = (color?: string | null): CardColor => {
  if (!color) return DEFAULT_CARD_COLOR
  const normalized = color.trim().toLowerCase()
  if (normalized in CARD_COLORS) {
    return normalized as CardColor
  }
  return CARD_COLOR_ALIASES[normalized] ?? DEFAULT_CARD_COLOR
}

export const getCardColor = (color?: string | null) => {
  return CARD_COLORS[normalizeCardColor(color)]
}

export const getAllColors = (): CardColor[] => {
  return Object.keys(CARD_COLORS) as CardColor[]
}
