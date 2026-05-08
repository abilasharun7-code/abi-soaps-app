import { supabase } from './supabase'

// Fetch all products from Supabase
export async function fetchProducts() {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('brand')
  return data || []
}

// Group products by brand: { 'Abi Soaps': [{...}, ...], ... }
export function groupByBrand(products) {
  return products.reduce((acc, p) => {
    if (!acc[p.brand]) acc[p.brand] = []
    acc[p.brand].push(p)
    return acc
  }, {})
}

// Get all unique brands
export function getBrands(products) {
  return [...new Set(products.map(p => p.brand))]
}

// Get products for a specific brand
export function getProductsForBrand(products, brand) {
  return products.filter(p => p.brand === brand)
}

// Get unit for a specific product name + brand
export function getUnit(products, brand, name) {
  const p = products.find(x => x.brand === brand && x.name === name)
  return p?.unit || 'pcs'
}
