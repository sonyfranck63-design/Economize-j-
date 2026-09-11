sed -i 's/ownerName: b.legal_name || b.name,/ownerId: b.owner_id,\n      ownerName: b.legal_name || b.name,/g' src/services/dataService.ts
