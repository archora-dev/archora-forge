export type SummaryItem = {
  label: string
  value: string | number
}

export function formatSummary(items: SummaryItem[]): string {
  return items.map((item) => `${item.label}: ${item.value}`).join('\n')
}
