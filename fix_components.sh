sed -i 's/biz.reviews.length/(biz.reviews?.length || 0)/g' src/components/BusinessDetailModal.tsx
sed -i 's/biz.services.length/(biz.services?.length || 0)/g' src/components/BusinessDetailModal.tsx
sed -i 's/biz.products.length/(biz.products?.length || 0)/g' src/components/BusinessDetailModal.tsx
sed -i 's/biz.reviews.map/(biz.reviews || []).map/g' src/components/BusinessDetailModal.tsx
sed -i 's/biz.services.map/(biz.services || []).map/g' src/components/BusinessDetailModal.tsx
sed -i 's/biz.products.map/(biz.products || []).map/g' src/components/BusinessDetailModal.tsx
