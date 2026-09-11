sed -i 's/q.proposals.filter/(q.proposals || []).filter/g' src/components/BusinessPortalView.tsx
sed -i 's/q.proposals.length/(q.proposals || []).length/g' src/components/BusinessPortalView.tsx
sed -i 's/qr.proposals.length/(qr.proposals || []).length/g' src/components/HomeView.tsx
sed -i 's/q.proposals.length/(q.proposals || []).length/g' src/components/BottomNav.tsx
sed -i 's/n.read/(n.read || false)/g' src/components/Header.tsx
sed -i 's/qr.proposals.length/(qr.proposals || []).length/g' src/components/QuotesView.tsx
