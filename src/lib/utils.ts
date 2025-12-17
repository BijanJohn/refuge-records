export function generateSlug(artist: string, title: string, id: number): string {
  return `${artist}-${title}-${id}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function formatPrice(price: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(price);
}

export function formatCondition(condition: string): string {
  const conditionMap: { [key: string]: string } = {
    'Mint (M)': 'Mint',
    'Near Mint (NM or M-)': 'Near Mint',
    'Very Good Plus (VG+)': 'VG+',
    'Very Good (VG)': 'VG',
    'Good Plus (G+)': 'G+',
    'Good (G)': 'Good',
    'Fair (F)': 'Fair',
    'Poor (P)': 'Poor',
  };
  return conditionMap[condition] || condition;
}
