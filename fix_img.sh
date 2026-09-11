sed -i 's/src={offer.imageUrl}/src={offer.imageUrl || undefined}/g' src/components/OffersView.tsx
sed -i 's/src={biz.coverImage}/src={biz.coverImage || undefined}/g' src/components/BusinessDetailModal.tsx
sed -i 's/src={biz.logo}/src={biz.logo || undefined}/g' src/components/BusinessDetailModal.tsx
sed -i 's/src={currentBiz.logo}/src={currentBiz.logo || undefined}/g' src/components/BusinessPortalView.tsx
sed -i 's/src={offer.imageUrl}/src={offer.imageUrl || undefined}/g' src/components/HomeView.tsx
sed -i 's/src={biz.logo}/src={biz.logo || undefined}/g' src/components/HomeView.tsx
