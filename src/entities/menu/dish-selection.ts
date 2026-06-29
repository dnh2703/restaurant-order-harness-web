import type { MenuItem, OptionGroup } from './model'

/** Option ids chosen per option group, keyed by group id. */
export type Selection = Record<string, string[]>

/** Pre-select the first option of every required SINGLE group so price is always valid. */
export function defaultSelection(item: MenuItem): Selection {
  const sel: Selection = {}
  for (const group of item.optionGroups) {
    if (group.isRequired && group.type === 'SINGLE' && group.options[0]) {
      sel[group.id] = [group.options[0].id]
    }
  }
  return sel
}

export function toggleOption(
  selection: Selection,
  group: OptionGroup,
  optionId: string,
): Selection {
  if (group.type === 'SINGLE') {
    return { ...selection, [group.id]: [optionId] }
  }
  const current = selection[group.id] ?? []
  const next = current.includes(optionId)
    ? current.filter((id) => id !== optionId)
    : [...current, optionId]
  return { ...selection, [group.id]: next }
}

export function selectedOptions(
  item: MenuItem,
  selection: Selection,
): { id: string; name: string; priceDelta: number }[] {
  const out: { id: string; name: string; priceDelta: number }[] = []
  for (const group of item.optionGroups) {
    const chosen = selection[group.id] ?? []
    for (const option of group.options) {
      if (chosen.includes(option.id)) {
        out.push({ id: option.id, name: option.name, priceDelta: option.priceDelta })
      }
    }
  }
  return out
}

export function selectionPrice(item: MenuItem, selection: Selection): number {
  return selectedOptions(item, selection).reduce((sum, o) => sum + o.priceDelta, item.price)
}

export function isSelectionValid(item: MenuItem, selection: Selection): boolean {
  return item.optionGroups.every(
    (group) => !group.isRequired || (selection[group.id]?.length ?? 0) > 0,
  )
}
